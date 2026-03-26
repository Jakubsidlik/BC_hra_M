# Teorie křídy (Math4fun)

Matematická karetní hra pro 2–8 hráčů. Hráči skládají levou stranu rovnice `L` z karet a snaží se trefit svůj cíl `R`. O vítězství rozhoduje ověření `Q.E.D.`.

🎮 **Hrát online:** [jakubsidlik.github.io/BC_hra_M](https://jakubsidlik.github.io/BC_hra_M/)

## Aktuální stav hry (03/2026)

- **Režimy:** `TUTORIÁL`, `ZŠ`, `SŠ`, `VŠ`
- **Počet hráčů:** 2 až 8
- **Herní flow:** hlavní menu, pravidla, výběr režimu, setup hráčů, handoff mezi tahy, výherní obrazovka a detail statistik po hře
- **Mechaniky:** drag&drop skládání výrazu, závorky `() [] {}`, exponenty, speciální sloty (integrál, suma, limit, determinant, vektor/skalár), limity tahu a odhazování
- **Efekty karet:** implementované a zapojené efekty `EFF_001` až `EFF_028` (včetně cílení, miniher a speciálních dialogů)
- **Ověřování rovnice:** aktuálně probíhá **lokálně ve frontendu** (Nerdamer + Math.js), backend už není nutný pro běžné hraní

## Technologie

| Část | Stack |
|------|-------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, dnd-kit, shadcn/ui, sonner |
| Matematický engine ve hře | Nerdamer + Math.js |
| Backend (volitelný) | Python, FastAPI, SymPy |
| Hosting | GitHub Pages (frontend), Render (backend) |

## Spuštění lokálně

### Frontend (doporučeno)
```bash
cd frontend
npm install
npm run dev
```

### Backend (volitelné API / samostatný SymPy engine)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Autor

Jakub Šídlík — bakalářská práce
