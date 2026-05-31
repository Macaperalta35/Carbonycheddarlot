import { useState, useEffect, useCallback } from "react";

export function useLocalStorage(key, initialValue) {
  // Obtener del almacenamiento local o usar valor inicial
  const readValue = useCallback(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error leyendo localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState(readValue);

  // Retornar una versión envuelta de la función setter de useState que persista el nuevo valor en localStorage.
  const setValue = useCallback(
    (value) => {
      try {
        // Permitir que el valor sea una función para que tengamos la misma API que useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          // Emitir un evento de almacenamiento personalizado para actualizar la misma pestaña también si es necesario
          window.dispatchEvent(new Event("local-storage-update"));
        }
      } catch (error) {
        console.warn(`Error guardando localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  useEffect(() => {
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setStoredValue(readValue());
    };

    // Escuchar cambios de otras pestañas
    window.addEventListener("storage", handleStorageChange);
    // Escuchar cambios de la misma pestaña (desencadenados por nuestro evento personalizado)
    window.addEventListener("local-storage-update", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("local-storage-update", handleStorageChange);
    };
  }, [readValue]);

  return [storedValue, setValue];
}
