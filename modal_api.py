from pathlib import Path

import modal


APP_NAME = "court-text-coding-api"
MODEL_ROOT = Path("/models")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .run_commands(
        "python -m pip install --index-url https://download.pytorch.org/whl/cpu torch==2.6.0"
    )
    .pip_install(
        "transformers==4.48.3",
        "fastapi==0.115.8",
        "pydantic==2.10.6",
        "safetensors==0.5.2",
    )
    .env({"TOKENIZERS_PARALLELISM": "false"})
)

app = modal.App(APP_NAME)
volume = modal.Volume.from_name("court-models")


@app.cls(
    image=image,
    volumes={str(MODEL_ROOT): volume},
    cpu=2.0,
    memory=8192,
    timeout=300,
    scaledown_window=300,
    max_containers=1,
)
class CourtCodingService:
    @modal.enter()
    def load_models(self):
        import importlib.util
        import os
        import sys
        import zipfile

        import torch

        torch.set_num_threads(2)
        os.environ["OMP_NUM_THREADS"] = "2"
        engine_dir = Path("/tmp/court_engine")
        engine_dir.mkdir(parents=True, exist_ok=True)
        dependency_zip = MODEL_ROOT / "code" / "scripts" / "coding_dependencies.zip"
        with zipfile.ZipFile(dependency_zip) as archive:
            archive.extractall(engine_dir)
        sys.path.insert(0, str(engine_dir))
        spec = importlib.util.spec_from_file_location(
            "court_coding_engine", engine_dir / "code_full_corpus_x_v1.py"
        )
        engine = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(engine)
        paths = {
            "claim_span": MODEL_ROOT / "claim_span",
            "evidence_item": MODEL_ROOT / "evidence_item",
            "fact_event": MODEL_ROOT / "fact_event",
            "evidence_objection": MODEL_ROOT / "evidence_objection",
        }
        self.engine = engine
        self.encoder = engine.Encoder(paths, batch_size=24, max_length=384)

    @modal.asgi_app()
    def web(self):
        import time
        import uuid

        from fastapi import FastAPI, HTTPException
        from fastapi.middleware.cors import CORSMiddleware
        from pydantic import BaseModel, Field

        api = FastAPI(title="Chinese Court Text Coding API", version="1.0")
        api.add_middleware(
            CORSMiddleware,
            allow_origins=["https://chin933.github.io"],
            allow_credentials=False,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["Content-Type"],
        )

        class AnalyzeRequest(BaseModel):
            text: str = Field(min_length=20, max_length=60000)

        @api.get("/health")
        def health():
            return {
                "status": "ok",
                "device": self.encoder.device,
                "models": sorted(self.encoder.models),
            }

        @api.post("/v1/analyze")
        def analyze(payload: AnalyzeRequest):
            text = payload.text.strip()
            if len(text) < 20:
                raise HTTPException(status_code=422, detail="text is too short")
            started = time.perf_counter()
            sample_id = f"web-{uuid.uuid4().hex[:12]}"
            record = {"doc_key": sample_id, "全文": text}
            result = self.engine.encode_document(
                record,
                source_file="web",
                source_row=1,
                encoder=self.encoder,
                id_field="doc_key",
                text_field="全文",
            )
            deterministic = self.engine.pilot.extract(
                {"sample_id": sample_id, "全文": text}
            )

            def spans(task: str):
                return [
                    {**row, "confidence": row["posterior"]}
                    for row in result["candidate_evidence"][task]
                ]

            x_v1 = result["x_v1"]
            metadata = result["metadata"]
            return {
                "sample_id": sample_id,
                "claim_spans": spans("claim_span"),
                "evidence_item_spans": spans("evidence_item"),
                "evidence_objection_spans": spans("evidence_objection"),
                "fact_event_spans": spans("fact_event"),
                "amount_mentions": result["candidate_evidence"]["amount_mentions"],
                "case_measures": {
                    "metadata": metadata,
                    "parties": {
                        **x_v1["party_burden"],
                        "source_spans": deterministic["evidence"].get("parties", {}),
                        "relations": deterministic.get("party_relations", {}),
                    },
                    "claims": {
                        **x_v1["claim_burden"],
                        "items": deterministic.get("claim_items", []),
                    },
                    "evidence": x_v1["evidence_burden"],
                    "objections": x_v1["evidence_objection_burden"],
                    "fact_event_burden": x_v1["fact_event_burden"],
                    "amount_exposure": x_v1["amount_exposure"],
                    "hearings": result["hearing_events"],
                    "hearing_summary": result["hearing_summary"],
                    "duration": {
                        "days": metadata.get("duration_days"),
                        "status": metadata.get("duration_status"),
                    },
                    "procedure_stage": metadata.get("procedure_stage"),
                    "procedure_flags": result["procedure_flags"],
                },
                "runtime_ms": round((time.perf_counter() - started) * 1000, 1),
            }

        return api
