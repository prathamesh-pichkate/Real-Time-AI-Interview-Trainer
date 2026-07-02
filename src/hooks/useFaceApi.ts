import { useState, useEffect } from "react";

declare global {
  interface Window {
    faceapi: any;
  }
}

export const useFaceApi = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already loaded globally, just set state and return
    if (window.faceapi && window.faceapi.nets.tinyFaceDetector.isLoaded && window.faceapi.nets.faceExpressionNet.isLoaded) {
      setIsLoaded(true);
      return;
    }

    const scriptId = "face-api-cdn-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const loadModels = async () => {
      try {
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setIsLoaded(true);
      } catch (err) {
        console.error("Error loading face-api models:", err);
        setError("Failed to load face detection models.");
      }
    };

    if (script) {
      // Script is already added, wait for load if not ready
      if (window.faceapi) {
        loadModels();
      } else {
        script.addEventListener("load", loadModels);
      }
      return;
    }

    script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js";
    script.async = true;
    
    script.addEventListener("load", loadModels);
    script.addEventListener("error", () => {
      setError("Failed to load face-api script from CDN.");
    });

    document.body.appendChild(script);

    return () => {
      // Don't clean up script entirely as other instances might need it,
      // but remove listeners to avoid memory leaks.
      if (script) {
        script.removeEventListener("load", loadModels);
      }
    };
  }, []);

  return { isLoaded, error };
};
