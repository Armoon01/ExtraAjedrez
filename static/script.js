let selected = null;
let currentTurn = "white";

async function loadBoard() {
    const res = await fetch('/api/board');
    const data = await res.json();
    currentTurn = data.turn;
    renderBoard(data.board);
    document.getElementById("turn").innerText = "Turno: " + currentTurn;
}
function renderBoard(board) {
    const boardDiv = document.getElementById('board');
    boardDiv.innerHTML = '';

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell ' + ((i + j) % 2 === 0 ? 'white' : 'black');
            cell.dataset.pos = `${i},${j}`;

            const piece = board[i][j];
            if (piece) {
                cell.innerHTML = pieceSymbol(piece);
            }

            cell.addEventListener('click', () => handleClick(i, j));
            boardDiv.appendChild(cell);
        }
    }

    // Llama a addClickEvents después de renderizar el tablero
    addClickEvents();
}

function pieceSymbol(piece) {
    const fileName = `${piece.color[0]}${piece.type}.png`; // ej: wp.png
    return `<img src="/static/images/${fileName}" class="piece-img">`;
  }
  function addClickEvents() {
    const cells = document.querySelectorAll(".cell");

    cells.forEach(cell => {
        cell.onclick = async () => {
            const [row, col] = cell.dataset.pos.split(",").map(Number);

            // Obtener el estado actual del tablero
            const res = await fetch("/api/board");
            const data = await res.json();
            const piece = data.board[row][col];

            // Verificar si hay pieza y si es del turno actual
            if (!piece || piece.color !== currentTurn) return;

            // Limpiar selección previa y mostrar movimientos
            clearHighlights();
            cell.classList.add("selected-cell");

            const response = await fetch("/legal_moves", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ row, col })
            });

            const result = await response.json();
            if (result.moves.length > 0) {
                result.moves.forEach(([r, c]) => {
                    const targetCell = document.querySelector(
                        `.cell[data-pos="${r},${c}"]`
                    );
                    targetCell.classList.add("legal-move");
                });
                selected = [row, col];
            }
        };
    });
}

function clearHighlights() {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.classList.remove("selected-cell", "legal-move");
    });
}
async function handleClick(x, y) {
    const cell = document.querySelector(`.cell[data-pos="${x},${y}"]`);
    const pieceImg = cell.querySelector("img");

    // Si no hay pieza seleccionada
    if (!selected) {
        if (!pieceImg) return; // No hay pieza en esa celda

        // Verificar si la pieza pertenece al turno actual
        const res = await fetch('/api/board');
        const data = await res.json();
        const piece = data.board[x][y];

        if (!piece || piece.color !== currentTurn) {
            return; // No es el turno de esta pieza
        }

        selected = [x, y];
        await showLegalMoves(x, y); // Mostrar movimientos
    } else {
        // Ya hay pieza seleccionada, intentar mover
        const moveRes = await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: selected, to: [x, y] })
        });

        const result = await moveRes.json();
        if (!result.success) alert('Movimiento inválido');
        selected = null;
        currentTurn = result.turn; // Actualizar turno
        renderBoard(result.board);
    }
}
window.onload = loadBoard;