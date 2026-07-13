(() => {
  'use strict';

  const SAVE_KEY = 'super-sean-007-save';
  const CLOUD_ID_KEY = 'super-sean-007-cloud-id';
  const CLOUD_ENABLED_KEY = 'super-sean-007-cloud-enabled';

  function currentId() {
    try { return localStorage.getItem(CLOUD_ID_KEY) || ''; } catch (error) { return ''; }
  }

  function currentSave() {
    try {
      const value = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!value || typeof value !== 'object' || typeof value.version !== 'number') throw new Error('No valid local save exists.');
      value.savedAt = Date.now();
      return value;
    } catch (error) {
      throw new Error('No valid local save exists yet. Start or continue the game first.');
    }
  }

  function makeId() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
  }

  function setCloud(id, enabled = true) {
    localStorage.setItem(CLOUD_ID_KEY, id);
    localStorage.setItem(CLOUD_ENABLED_KEY, String(enabled));
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {credentials: 'same-origin', cache: 'no-store', ...options});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.message || body.error || `Cloud request failed (${response.status}).`);
      error.status = response.status;
      error.details = body;
      throw error;
    }
    return body;
  }

  async function upload(id, save, overwrite = false) {
    return request(`/api/save?id=${encodeURIComponent(id)}${overwrite ? '&force=1' : ''}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        ...(overwrite ? {'x-ssg-overwrite': 'confirm'} : {})
      },
      body: JSON.stringify(save)
    });
  }

  async function loadCurrent() {
    const id = currentId();
    if (!id) throw new Error('No Cloud Sync ID is stored on this device.');
    const save = await request(`/api/save?id=${encodeURIComponent(id)}`);
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    setCloud(id, true);
    return {message: `Cloud save loaded: level ${save.hero?.level || 1}. Reload the page to continue.`, reload: true};
  }

  async function overwriteCurrent() {
    const id = currentId();
    if (!id) throw new Error('Enable Cloud Sync before overwriting a cloud save.');
    const save = currentSave();
    await upload(id, save, true);
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return {message: 'The cloud copy was explicitly replaced with this device’s current save.'};
  }

  async function rotateId() {
    const oldId = currentId();
    const newId = makeId();
    const save = currentSave();
    await upload(newId, save, false);
    setCloud(newId, true);
    if (oldId) {
      await request(`/api/save?id=${encodeURIComponent(oldId)}`, {method: 'DELETE'}).catch(() => {});
    }
    return {message: `Cloud Sync ID rotated. New ID: ${newId}`, id: newId};
  }

  async function deleteCloud() {
    const id = currentId();
    if (!id) throw new Error('No Cloud Sync ID is stored on this device.');
    await request(`/api/save?id=${encodeURIComponent(id)}`, {method: 'DELETE'});
    localStorage.removeItem(CLOUD_ID_KEY);
    localStorage.setItem(CLOUD_ENABLED_KEY, 'false');
    return {message: 'The cloud copy and its ID were deleted. Your local browser save remains available.'};
  }

  function downloadBackup() {
    const save = currentSave();
    const blob = new Blob([JSON.stringify(save, null, 2)], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `super-sean-007-save-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    return {message: 'A readable JSON backup was downloaded.'};
  }

  window.SSGCloudControls = {
    currentId,
    loadCurrent,
    overwriteCurrent,
    rotateId,
    deleteCloud,
    downloadBackup
  };
})();
