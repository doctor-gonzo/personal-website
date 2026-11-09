(() => {
  const button = document.getElementById('copy-prompt');
  const prompt = document.getElementById('intro-prompt');
  const preview = document.getElementById('prompt-preview');
  const status = document.getElementById('copy-status');

  button.hidden = false;
  button.addEventListener('click', async () => {
    let copied = false;
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(prompt.value);
      copied = true;
      status.textContent = 'Copied. Paste it into your AI assistant.';
    } catch {
      preview.open = true;
      prompt.focus();
      prompt.select();
      status.textContent = 'Select and copy the prompt below.';
    } finally {
      button.disabled = false;
      if (copied) button.focus();
    }
  });
})();
