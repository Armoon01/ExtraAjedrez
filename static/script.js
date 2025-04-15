let selected = null;
let currentTurn = "white";
let gameOver = false;

async function loadBoard() {
    const res = await fetch('/api/board');
    const data = await res.json();
    currentTurn = data.turn;
    gameOver = data.game_over;

    if (gameOver) {
        alert(data.winner ? `${data.winner} gana el juego` : "Empate");
        return;
    }

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
                const pieceImg = document.createElement('img');
                pieceImg.src = `/static/images/${piece.color[0]}${piece.type}.png`;
                pieceImg.className = 'piece-img';
                pieceImg.draggable = piece.color === currentTurn;

                pieceImg.addEventListener('dragstart', (e) => handleDragStart(e, i, j));
                pieceImg.addEventListener('dragend', handleDragEnd);
                cell.appendChild(pieceImg);
            }

            if (kingInCheck && kingInCheck[0] === i && kingInCheck[1] === j) {
                cell.classList.add('blink');
                setTimeout(() => cell.classList.remove('blink'), 1000);
            }

            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('drop', (e) => handleDrop(e, i, j));
            cell.addEventListener('click', () => handleClick(i, j));

            boardDiv.appendChild(cell);
        }
    }
}

function handleDragStart(e, x, y) {
    if (gameOver) return;

    e.dataTransfer.setData('text/plain', JSON.stringify({ from: [x, y] }));
    e.dataTransfer.effectAllowed = "move"; // Permitir solo mover, no copiar
    selected = [x, y];
    clearHighlights();
    showLegalMoves(x, y);

    // Configurar una imagen fantasma transparente
    const img = new Image();
    img.src = ''; // Imagen vacía para que no se muestre nada
    e.dataTransfer.setDragImage(img, 0, 0);

    // Agregar la clase "dragging" a la pieza
    e.target.classList.add("dragging");
}

function handleDragEnd(e) {
    // Eliminar la clase "dragging" de la pieza
    e.target.classList.remove("dragging");
}

function handleDragOver(e) {

    e.preventDefault(); // Necesario para permitir el drop
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"; // Mostrar que el elemento se moverá
}

async function handleDrop(e, x, y) {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    const from = JSON.parse(data).from;
    const to = [x, y];

    await attemptMove(from, to);
}

async function handleClick(x, y) {
    if (gameOver) return;

    const cell = document.querySelector(`.cell[data-pos="${x},${y}"]`);
    const pieceImg = cell.querySelector("img");

    const res = await fetch('/api/board');
    const data = await res.json();
    const piece = data.board[x][y];

    if (!selected) {
        if (!pieceImg || !piece || piece.color !== currentTurn) return;
        selected = [x, y];
        clearHighlights();
        await showLegalMoves(x, y);
    } else {
        if (piece && piece.color === currentTurn) {
            selected = [x, y];
            clearHighlights();
            await showLegalMoves(x, y);
            return;
        }

        await attemptMove(selected, [x, y]);
    }
}
function showPromotionMenu(result, from, to) {
    const modal = document.getElementById("promotion-menu");
    modal.classList.remove("hidden");

    const buttons = document.querySelectorAll(".promotion-option");
    buttons.forEach(button => {
        button.onclick = async () => {
            const promotionChoice = button.dataset.piece;

            // Enviar la promoción al backend
            const promotionRes = await fetch('/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, to, piece_type: promotionChoice })
            });

            const promotionResult = await promotionRes.json();

            if (!promotionResult.success) {
                alert(promotionResult.error || "Error al promover la pieza.");
            } else {
                currentTurn = promotionResult.turn;
                await loadBoard(); // Recargar el tablero después de la promoción
            }

            modal.classList.add("hidden");
        };
    });

    document.getElementById("close-promotion-menu").onclick = () => {
        modal.classList.add("hidden");
    };
}
async function attemptMove(from, to) {
    const moveRes = await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to })
    });

    const result = await moveRes.json();

    if (!result.success) {
        if (result.move_does_not_cover_check) {
            const kingCell = document.querySelector(
                `.cell[data-pos="${result.king_position[0]},${result.king_position[1]}"]`
            );
            if (kingCell) {
                kingCell.classList.add('blink');
                setTimeout(() => kingCell.classList.remove('blink'), 1000);
            }

            clearHighlights();
            await showLegalMoves(from[0], from[1]);
        }

        // Reproducir sonido de movimiento ilegal
        playSound('illegal.mp3');
        return;
    }

    // Reproducir sonido según el tipo de movimiento
    if (result.castle) {
        playSound('castle.mp3'); // Sonido de enroque
    } else if (result.captured_piece) {
        playSound('capture.mp3'); // Sonido de captura
    } else if (result.promotion_required) {
        playSound('promote.mp3'); // Sonido de promoción
    } else {
        playSound('move-self.mp3'); // Sonido de movimiento normal
    }

    await loadBoard();

    if (result.promotion_required) {
        showPromotionMenu(result, from, to);
        return;
    }

    currentTurn = result.turn;
    switchTimer();
}
async function showLegalMoves(row, col) {
    const response = await fetch("/legal_moves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, col })
    });

    const result = await response.json();
    console.log("Movimientos legales:", result.moves);
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
function clearHighlights() {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.classList.remove("selected-cell", "legal-move");
    });
}

let whiteTime = 600;
let blackTime = 600;
let currentTimer = "white";
let timerInterval;

function startTimer() {
    timerInterval = setInterval(() => {
        if (currentTimer === "white") {
            whiteTime--;
            updateTimerDisplay("white", whiteTime);
            rotateClock("white");
            if (whiteTime <= 0) {
                clearInterval(timerInterval);
                alert("¡El tiempo del jugador blanco se ha agotado!");
            }
        } else {
            blackTime--;
            updateTimerDisplay("black", blackTime);
            rotateClock("black");
            if (blackTime <= 0) {
                clearInterval(timerInterval);
                alert("¡El tiempo del jugador negro se ha agotado!");
            }
        }
    }, 1000);
}

let whiteClockAngle = 0;
let blackClockAngle = 0;

function rotateClock(player) {
    const clockHand = document.getElementById(`${player}-clock-hand`);
    if (!clockHand) return;

    if (player === "white") {
        whiteClockAngle = (whiteClockAngle + 90) % 360;
        clockHand.setAttribute("transform", `rotate(${whiteClockAngle} 50 50)`);
    } else {
        blackClockAngle = (blackClockAngle + 90) % 360;
        clockHand.setAttribute("transform", `rotate(${blackClockAngle} 50 50)`);
    }
}

function updateTimerDisplay(player, time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const timerElement = document.querySelector(`.${player}-timer`);
    timerElement.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function switchTimer() {
    currentTimer = currentTimer === "white" ? "black" : "white";
    document.querySelector(".white-clock").classList.toggle("hidden", currentTimer !== "white");
    document.querySelector(".black-clock").classList.toggle("hidden", currentTimer !== "black");
}
function playSound(sound) {
    const audio = new Audio(`/static/sounds/${sound}`);
    audio.play();
}
window.onload = () => {
    loadBoard();
    startTimer();
    document.querySelector(".white-clock").classList.remove("hidden");
    document.querySelector(".black-clock").classList.add("hidden");
};
document.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "none";
});

document.addEventListener("drop", (e) => {
    e.preventDefault();
});