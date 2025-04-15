let selected = null;
let currentTurn = "white";
let gameOver = false;

async function loadBoard() {
    const res = await fetch('/api/board');
    const data = await res.json();
    currentTurn = data.turn;
    gameOver = data.game_over;

    if (gameOver) {
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

    // Determinar el color del jugador que está promoviendo
    const promotionColor = result.promotion_piece_color; // Esto debe venir del backend

    // Actualizar las imágenes de las piezas en el menú de promoción
    const buttons = document.querySelectorAll(".promotion-option");
    buttons.forEach(button => {
        const pieceType = button.dataset.piece;
        const pieceImg = button.querySelector("img");
        pieceImg.src = `/static/images/${promotionColor[0]}${pieceType[0]}.png`; // Actualizar la imagen
        pieceImg.alt = `${promotionColor} ${pieceType}`;
    });

    // Configurar los eventos de clic para las opciones de promoción
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

    // Configurar el botón de cerrar el menú
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
        playSound('illegal.mp3');
        return;
    }

    // Reproducir sonido según el tipo de movimiento
    if (result.castle) {
        playSound('castle.mp3');
    } else if (result.captured_piece) {
        playSound('capture.mp3');
    } else if (result.in_check) {
        playSound('capture.mp3');
    } else if (result.promotion_required) {
        playSound('promote.mp3');
    } else {
        playSound('move-self.mp3');
    }

    await loadBoard();

    if (result.promotion_required) {
        showPromotionMenu(result, from, to);
        return;
    }

    // Mostrar animación de jaque mate si el juego ha terminado
    if (result.game_over) {
        console.log(result)
        console.log("Juego terminado:", result.winner);
        console.log(result.king_position, result.loser_king_position);
        if (result.king_position && result.loser_king_position) {
            console.log("entre al if")
            renderBoard(result.board, result.king_in_check);
            showCheckmateAnimation(result.king_position, result.loser_king_position);
        } else {
            console.error("Faltan posiciones del rey en la respuesta del backend.");
        }

        // Detener el temporizador
        clearInterval(timerInterval);

        document.getElementById("reset-game").classList.remove("hidden");
        renderBoard(result.board, result.king_in_check);
        return;
    }

    currentTurn = result.turn;
    switchTimer();
}
function showCheckmateAnimation(winnerKingPosition, loserKingPosition) {
    console.log("Mostrar animación de jaque mate");

    const board = document.getElementById('board');
    const boardRect = board.getBoundingClientRect();
    const cellSize = boardRect.width / 8; // Tamaño de una celda (asumiendo un tablero de 8x8)

    const winner = document.getElementById("winner");
    const checkmate = document.getElementById("checkmate");

    // Posicionar la animación de Winner sobre la casilla del rey ganador
    winner.style.left = `${winnerKingPosition[1] * cellSize + boardRect.left}px`;
    winner.style.top = `${winnerKingPosition[0] * cellSize + boardRect.top}px`;
    winner.style.width = `${cellSize}px`;
    winner.style.height = `${cellSize}px`;
    winner.classList.remove("hidden");

    // Posicionar la animación de Checkmate sobre la casilla del rey perdedor
    checkmate.style.left = `${loserKingPosition[1] * cellSize + boardRect.left}px`;
    checkmate.style.top = `${loserKingPosition[0] * cellSize + boardRect.top}px`;
    checkmate.style.width = `${cellSize}px`;
    checkmate.style.height = `${cellSize}px`;
    checkmate.classList.remove("hidden");

    // Activar la animación de reducción y movimiento a la esquina superior derecha
    setTimeout(() => {
        winner.classList.add("shrink", "winner-final");
        checkmate.classList.add("shrink", "checkmate-final");

        // Desvanecer el texto durante la animación
        winner.querySelector("span").style.opacity = "0";
        checkmate.querySelector("span").style.opacity = "0";
    }, 3000);

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
document.getElementById("reset-game").addEventListener("click", async () => {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
        console.log("Juego reiniciado");

        // Reiniciar el tablero
        renderBoard(data.board);
        document.getElementById("turn").innerText = "Turno: " + data.turn;

        // Reiniciar los relojes
        whiteTime = 600; // 10 minutos en segundos
        blackTime = 600; // 10 minutos en segundos
        currentTimer = "white"; // Reiniciar al jugador blanco
        clearInterval(timerInterval); // Detener el temporizador actual
        updateTimerDisplay("white", whiteTime);
        updateTimerDisplay("black", blackTime);
        startTimer(); // Iniciar el temporizador para el jugador blanco

        // Mostrar el reloj del jugador blanco y ocultar el del jugador negro
        document.querySelector(".white-clock").classList.remove("hidden");
        document.querySelector(".black-clock").classList.add("hidden");

        // Reiniciar el estado del juego
        gameOver = false;
        document.getElementById("winner").classList.add("hidden");
        document.getElementById("checkmate").classList.add("hidden");

        document.getElementById("winner").classList.remove("shrink", "winner-final");
        document.getElementById("checkmate").classList.remove("shrink", "checkmate-final");

        document.querySelector("#winner span").style.opacity = "1";
        document.querySelector("#checkmate span").style.opacity = "1";
        // Ocultar el botón de reinicio
        document.getElementById("reset-game").classList.add("hidden");
    }
});
function updateTimerDisplay(player, time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const timerElement = document.querySelector(`.${player}-timer`);
    timerElement.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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