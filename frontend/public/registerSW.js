// Compatibility for tabs still running the original PWA registration script.
if ('serviceWorker' in navigator) {
  let controlada = Boolean(navigator.serviceWorker.controller)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlada) window.location.reload()
    controlada = true
  })
  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then(registration => registration.update())
    .catch(() => { /* Keep the current page available when offline. */ })
}
