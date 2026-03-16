document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('photoInput');
  const avatar = document.querySelector('.avatar-circle');

  if (input && avatar) {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert("File exceeds 2MB limit.");
        input.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = function(evt) {
        avatar.style.backgroundImage = `url(${evt.target.result})`;
        avatar.style.backgroundSize = "cover";
        avatar.style.color = "transparent";
      };
      reader.readAsDataURL(file);
    });
  }
});
