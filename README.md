# Teorie křídy — Matematická karetní duelovka

Strategická karetní hra pro 2–8 hráčů zasazená do univerzitního prostředí, kde hráči sestavují matematické identity pomocí karet se symboly, operacemi a speciálními efekty. Cílem je jako první složit platnou rovnici (L = R), kterou ověří matematický engine na serveru.

🎮 **Hrát online:** [jakubsidlik.github.io/BC_hra_M](https://jakubsidlik.github.io/BC_hra_M/)

## Hlavní prvky hry

- **Stavba rovnic** — hráči přetahují karty na svou tabuli a skládají výrazy s čísly, funkcemi (sin, cos, tan), integrály, derivacemi, limitami a dalšími
- **Speciální efekty karet** — karty mohou narušit soupeřovu rovnici nebo posílit tu vlastní
- **Více úrovní obtížnosti** — od základní po pokročilou matematiku
- **Ověření pomocí SymPy** — backend symbolicky ověří, zda levá strana rovnice odpovídá pravé

## Technologie

| Část | Stack |
|------|-------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, dnd-kit, Radix UI |
| Backend | Python, FastAPI, SymPy |
| Hosting | GitHub Pages (frontend), Render (backend) |

## Spuštění lokálně

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Autor

Jakub Šídlík — Bakalářská práce
