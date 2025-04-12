let selected = null;
let currentTurn = "white";

async function loadBoard() {
    const res = await fetch('/api/board');
    const data = await res.json();
    currentTurn = data.turn;
    renderBoard(data.board, data.king_in_check); // Pasar la posición del rey en jaque
    document.getElementById("turn").innerText = "Turno: " + currentTurn;
}

function renderBoard(board, kingInCheck = null) {
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

            // Resaltar la casilla del rey si está en jaque
            console.log("King in check:", kingInCheck);
            if (kingInCheck && kingInCheck[0] === i && kingInCheck[1] === j) {
                cell.classList.add('in-check');
            }

            cell.addEventListener('click', () => handleClick(i, j));
            boardDiv.appendChild(cell);
        }
    }
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
        // Intentar mover la pieza seleccionada
        const moveRes = await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: selected, to: [x, y] })
        });

        const result = await moveRes.json();

        // Manejar la respuesta del backend
        if (!result.success) {
            // alert(result.message); // Eliminar o comentar esta línea
            if (result.in_check) {
                const kingCell = document.querySelector(
                    `.cell[data-pos="${result.king_position[0]},${result.king_position[1]}"]`
                );
                kingCell.classList.add("blink");
                setTimeout(() => kingCell.classList.remove("blink"), 2000); // Parpadeo por 2 segundos
            }
        } else {
            currentTurn = result.turn; // Actualizar turno
            await loadBoard(); // Actualizar el tablero dinámicamente

            // Si el rey sigue en jaque, hacer que la casilla parpadee
            if (result.in_check) {
                const kingCell = document.querySelector(
                    `.cell[data-pos="${result.king_position[0]},${result.king_position[1]}"]`
                );
                kingCell.classList.add("blink");
                setTimeout(() => kingCell.classList.remove("blink"), 2000); // Parpadeo por 2 segundos
            }

            // Si el movimiento no cubre el jaque, hacer que la casilla parpadee
            if (result.move_does_not_cover_check) {
                const kingCell = document.querySelector(
                    `.cell[data-pos="${result.king_position[0]},${result.king_position[1]}"]`
                );
                kingCell.classList.add("blink");
                setTimeout(() => kingCell.classList.remove("blink"), 2000); // Parpadeo por 2 segundos
            }
        }

        selected = null;
    }
}

async function showLegalMoves(row, col) {
    const response = await fetch("/legal_moves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, col })
    });

    const result = await response.json();
    clearHighlights();

    if (result.moves.length > 0) {
        const cell = document.querySelector(`.cell[data-pos="${row},${col}"]`);
        cell.classList.add("selected-cell");

        result.moves.forEach(([r, c]) => {
            const targetCell = document.querySelector(`.cell[data-pos="${r},${c}"]`);
            targetCell.classList.add("legal-move");
        });
    }
}
window.onload = loadBoard;