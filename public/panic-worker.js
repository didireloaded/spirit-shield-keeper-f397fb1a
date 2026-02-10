/**
 * Panic Recording Service Worker
 * Handles background audio recording and evidence upload
 * Continues working even when the phone is locked or browser is minimized
 */

const CHUNK_DURATION_MS = 10000; // 10 second chunks
let mediaRecorder = null;
let recordingInterval = null;
let sessionId = null;
let chunkIndex = 0;
let supabaseUrl = '';
let supabaseKey = '';

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'START_RECORDING':
      sessionId = data.sessionId;
      supabaseUrl = data.supabaseUrl;
      supabaseKey = data.supabaseKey;
      chunkIndex = 0;
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'RECORDING_STARTED', sessionId });
        });
      });
      break;

    case 'UPLOAD_CHUNK':
      await uploadChunk(data.blob, data.sessionId, data.chunkIndex, data.startTime, data.endTime);
      break;

    case 'STOP_RECORDING':
      sessionId = null;
      chunkIndex = 0;
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'RECORDING_STOPPED' });
        });
      });
      break;

    case 'UPDATE_LOCATION':
      if (sessionId) {
        await updatePanicLocation(data);
      }
      break;
  }
});

async function uploadChunk(blob, panicSessionId, index, startTime, endTime) {
  try {
    const fileName = `${panicSessionId}/chunk_${index}_${Date.now()}.webm`;
    
    // Upload to Supabase Storage
    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/audio-evidence/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'audio/webm',
        },
        body: blob,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const fileUrl = `${supabaseUrl}/storage/v1/object/public/audio-evidence/${fileName}`;

    // Record chunk metadata in database
    const metaResponse = await fetch(
      `${supabaseUrl}/rest/v1/panic_audio_chunks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          panic_session_id: panicSessionId,
          chunk_index: index,
          file_url: fileUrl,
          chunk_start_time: startTime,
          chunk_end_time: endTime,
          duration_seconds: CHUNK_DURATION_MS / 1000,
          file_size_bytes: blob.size,
        }),
      }
    );

    // Notify main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CHUNK_UPLOADED',
          chunkIndex: index,
          fileUrl,
          size: blob.size,
        });
      });
    });
  } catch (error) {
    console.error('[PanicWorker] Upload error:', error);
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CHUNK_ERROR',
          chunkIndex: index,
          error: error.message,
        });
      });
    });
  }
}

async function updatePanicLocation(data) {
  try {
    await fetch(
      `${supabaseUrl}/rest/v1/panic_location_logs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.token}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          panic_session_id: sessionId,
          lat: data.latitude,
          lng: data.longitude,
          speed: data.speed,
          heading: data.heading,
          accuracy: data.accuracy,
          battery_level: data.batteryLevel,
          is_moving: (data.speed || 0) > 0.5,
          recorded_at: new Date().toISOString(),
        }),
      }
    );
  } catch (error) {
    console.error('[PanicWorker] Location update error:', error);
  }
}

// Keep-alive ping to prevent service worker from being terminated
setInterval(() => {
  if (sessionId) {
    console.log('[PanicWorker] Keep-alive ping, session:', sessionId);
  }
}, 25000);
