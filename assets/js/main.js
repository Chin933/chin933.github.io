// Mobile nav toggle
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
  }

  // Lightbox for the fieldwork gallery
  var lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('img');
    var lbCaption = lightbox.querySelector('.caption');
    document.querySelectorAll('.gallery figure img').forEach(function (img) {
      img.addEventListener('click', function () {
        lbImg.src = img.src;
        lbCaption.textContent = img.getAttribute('alt') || '';
        lightbox.classList.add('open');
      });
    });
    function closeLb() { lightbox.classList.remove('open'); }
    lightbox.addEventListener('click', closeLb);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLb();
    });
  }
});
