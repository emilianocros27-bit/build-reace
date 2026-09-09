# Traction Yard

Juego de conducción 3D en el navegador. Un solo archivo HTML, sin dependencias que instalar.

Circuito modelado sobre el **Autódromo Hermanos Rodríguez** (incluida la sección del Foro Sol): recta principal, curva 1 + "S" de Moss, las eses del Sector 2, la horquilla lenta del estadio y la Peraltada.

## Jugar

Abre `index.html` en un navegador (doble clic), o sírvelo:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Controles

| Tecla | Acción |
|---|---|
| `W` / `↑` | Acelerar |
| `S` / `↓` | Frenar (progresivo) |
| `A` `D` / `← →` | Dirección |
| `Q` / `E` | Bajar / subir marcha (modo manual) |
| `Shift` | Subir marcha (modo manual) |
| `Espacio` | Bajar marcha (modo manual) |
| `B` | Freno de mano |
| — | Embrague automático |
| `M` | Cambiar manual / automático |
| `C` | Cambiar cámara |
| `R` | Reiniciar coche |

## Stack

- three.js r128 + cannon.js 0.6.2 (builds globales, sin módulos)
- Físicas: `CANNON.RaycastVehicle`, suspensión por raycast
- Todo procedural: texturas en `<canvas>`, sin imágenes externas
- Caja de cambios de 6 velocidades manual/automática, ~220 km/h, aceleración y frenado realistas
- Tacómetro + velocímetro, cronómetro por sectores, minimapa

## Archivos

- `index.html` — el juego (standalone, listo para GitHub Pages)
- `traction-yard.html` — el mismo contenido sin el envoltorio `<!doctype>` (fragmento del Artifact)
