let selected = null;
let currentTurn = "white";

async function loadBoard() {
    const res = await fetch('/api/board');
    const data = await res.json();
    currentTurn = data.turn;

    // Pasar la posición del rey en jaque a renderBoard
    renderBoard(data.board, data.king_in_check);
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
            if (kingInCheck && kingInCheck[0] === i && kingInCheck[1] === j) {
                cell.classList.add('blink');

                // Detener la animación después de 1 segundo
                setTimeout(() => {
                    cell.classList.remove('blink');
                }, 1000);
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

function clearHighlights() {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.classList.remove("selected-cell", "legal-move");
    });
}

async function handleClick(x, y) {
    const cell = document.querySelector(`.cell[data-pos="${x},${y}"]`);
    const pieceImg = cell.querySelector("img");

    if (!selected) {
        if (!pieceImg) return;

        const res = await fetch('/api/board');
        const data = await res.json();
        const piece = data.board[x][y];

        if (!piece || piece.color !== currentTurn) {
            return;
        }

        selected = [x, y];
        clearHighlights();
        await showLegalMoves(x, y);
    } else {
        const res = await fetch('/api/board');
        const data = await res.json();
        const piece = data.board[x][y];

        // Si seleccionas otra pieza del mismo color, cambia la selección
        if (piece && piece.color === currentTurn) {
            selected = [x, y];
            clearHighlights();
            await showLegalMoves(x, y);
            return;
        }

        // Intentar mover la pieza seleccionada
        const moveRes = await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: selected, to: [x, y] })
        });

        const result = await moveRes.json();
        console.log("Respuesta del backend:", result); // Depuración

        if (!result.success) {
            // Si el movimiento no es válido y no cubre el jaque
            if (result.move_does_not_cover_check) {
                const kingCell = document.querySelector(
                    `.cell[data-pos="${result.king_position[0]},${result.king_position[1]}"]`
                );
                kingCell.classList.add('blink');

                // Detener la animación después de 1 segundo
                setTimeout(() => {
                    kingCell.classList.remove('blink');
                }, 1000);

                // Mantener la selección activa y mostrar los movimientos legales nuevamente
                clearHighlights();
                await showLegalMoves(selected[0], selected[1]);
            }
        } else {
            // Manejar la coronación
            if (result.promotion_required) {
                console.log("Llamando a showPromotionMenu"); // Depuración
                showPromotionMenu(result, selected, [x, y]);
                return;
            }

            currentTurn = result.turn;
            await loadBoard();
            selected = null; // Reiniciar la selección después de un movimiento válido
        }
    }
}
function showPromotionMenu(result, from, to) {
    console.log("Mostrando el menú de promoción");
    const menu = document.getElementById("promotion-menu");
    menu.classList.remove("hidden"); // Mostrar el modal

    // Asignar eventos a las opciones de promoción
    document.querySelectorAll(".promotion-option").forEach(option => {
        option.onclick = async () => {
            const promotionChoice = option.dataset.piece;

            const promotionRes = await fetch('/api/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, to, promotion_choice: promotionChoice })
            });

            const promotionResult = await promotionRes.json();
            console.log("Resultado de la promoción:", promotionResult); // Depuración

            if (!promotionResult.success) {
                alert(promotionResult.message);
            } else {
                currentTurn = promotionResult.turn;
                await loadBoard(); // Actualizar el tablero
            }

            menu.classList.add("hidden"); // Ocultar el modal
        };
    });

    // Asignar evento al botón de cierre
    document.getElementById("close-promotion-menu").onclick = () => {
        menu.classList.add("hidden"); // Ocultar el modal
    };
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