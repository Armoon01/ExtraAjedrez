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

function renderBoard(board, kingInCheck = null, last_move) {
    const boardDiv = document.getElementById('board');
        // Eliminar solo las celdas del tablero, preservando otros elementos
     // Eliminar solo las celdas del tablero, preservando otros elementos
     const cells = boardDiv.querySelectorAll('.cell');
     cells.forEach(cell => cell.remove());
 
    

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
    if (last_move) {
        const originCell = document.querySelector(`.cell[data-pos="${last_move.from[0]},${last_move.from[1]}"]`);
        const destinationCell = document.querySelector(`.cell[data-pos="${last_move.to[0]},${last_move.to[1]}"]`);
        if (originCell) originCell.classList.add("highlight-origin");
        if (destinationCell) destinationCell.classList.add("highlight-destination");
    }
}

function handleDragStart(e, x, y) {
    if (gameOver) return;

    e.dataTransfer.setData('text/plain', JSON.stringify({ from: [x, y] }));
    e.dataTransfer.effectAllowed = "move"; // Permitir solo mover, no copiar
    selected = [x, y];
    clearHighlights(true); // Limpiar resaltados excepto el último movimiento
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
        clearHighlights(true); // Limpiar resaltados excepto el último movimiento
        await showLegalMoves(x, y);
    } else {
        if (piece && piece.color === currentTurn) {
            selected = [x, y];
            clearHighlights(true); // Limpiar resaltados excepto el último movimiento
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

    // Limpiar los resaltados anteriores
    clearHighlights();

    // Resaltar las casillas del movimiento actual
    const originCell = document.querySelector(`.cell[data-pos="${from[0]},${from[1]}"]`);
    const destinationCell = document.querySelector(`.cell[data-pos="${to[0]},${to[1]}"]`);
    if (originCell) originCell.classList.add("highlight-origin");
    if (destinationCell) destinationCell.classList.add("highlight-destination");

    await loadBoard();

    if (result.promotion_required) {
        showPromotionMenu(result, from, to);
        return;
    }

    // Mostrar animación de jaque mate si el juego ha terminado
    if (result.game_over) {
        console.log("Juego terminado:", result.winner);
        console.log(result);
        if(result.stalemate) {
            console.log("Juego terminado por ahogado");
            const blackKingPosition = result.black_king_position;
            const whiteKingPosition = result.white_king_position;
            renderBoard(result.board, null, result.last_move);
            showStalemateAnimation(blackKingPosition, whiteKingPosition);
        }
        else if (result.king_position && result.loser_king_position) {
            renderBoard(result.board, null, result.last_move);
            showCheckmateAnimation(result.king_position, result.loser_king_position);
        } else {
            console.error("Faltan posiciones del rey en la respuesta del backend.");
        }

        // Detener el temporizador
        clearInterval(timerInterval);

        document.getElementById("reset-game").classList.remove("hidden");
        return;
    }

    currentTurn = result.turn;
    switchTimer();

    // Resaltar el último movimiento del oponente
    if (result.last_move) {
        const lastOrigin = document.querySelector(`.cell[data-pos="${result.last_move.from[0]},${result.last_move.from[1]}"]`);
        const lastDestination = document.querySelector(`.cell[data-pos="${result.last_move.to[0]},${result.last_move.to[1]}"]`);
        if (lastOrigin) lastOrigin.classList.add("highlight-origin");
        if (lastDestination) lastDestination.classList.add("highlight-destination");
    }
}
function showStalemateAnimation(blackKingPosition, whiteKingPosition) {
    console.log("Mostrar animación de empate por ahogado");

    const board = document.getElementById('board');
    const boardRect = board.getBoundingClientRect();
    const cellSize = boardRect.width / 8; // Tamaño de una celda (asumiendo un tablero de 8x8)

    const drawBlack = document.getElementById("draw-black");
    const drawWhite = document.getElementById("draw-white");

    // Calcular las posiciones del rey negro (relativas al tablero)
    const blackLeft = blackKingPosition[1] * cellSize;
    const blackTop = blackKingPosition[0] * cellSize;

    // Calcular las posiciones del rey blanco (relativas al tablero)
    const whiteLeft = whiteKingPosition[1] * cellSize;
    const whiteTop = whiteKingPosition[0] * cellSize;

    console.log("Coordenadas del rey negro:", blackLeft, blackTop);
    console.log("Coordenadas del rey blanco:", whiteLeft, whiteTop);

    // Posicionar la animación de empate para el rey negro
    drawBlack.style.position = "absolute";
    drawBlack.style.left = `${blackLeft}px`;
    drawBlack.style.top = `${blackTop}px`;
    drawBlack.style.width = `${cellSize}px`;
    drawBlack.style.height = `${cellSize}px`;
    drawBlack.classList.remove("hidden");

    // Posicionar la animación de empate para el rey blanco
    drawWhite.style.position = "absolute";
    drawWhite.style.left = `${whiteLeft}px`;
    drawWhite.style.top = `${whiteTop}px`;
    drawWhite.style.width = `${cellSize}px`;
    drawWhite.style.height = `${cellSize}px`;
    drawWhite.classList.remove("hidden");

    // Activar la animación de reducción y movimiento a la esquina superior derecha
    setTimeout(() => {
        drawBlack.classList.add("shrink", "draw-final");
        drawWhite.classList.add("shrink", "draw-final");

        // Desvanecer el texto durante la animación
        drawBlack.querySelector("span").style.opacity = "0";
        drawWhite.querySelector("span").style.opacity = "0";
    }, 3000);
}
function showCheckmateAnimation(winnerKingPosition, loserKingPosition) {
    console.log("Mostrar animación de jaque mate");

    const board = document.getElementById('board');
    const boardRect = board.getBoundingClientRect();
    const cellSize = boardRect.width / 8; // Tamaño de una celda (asumiendo un tablero de 8x8)

    const winner = document.getElementById("winner");
    const checkmate = document.getElementById("checkmate");

    // Calcular las posiciones del rey ganador (relativas al tablero)
    const winnerLeft = winnerKingPosition[1] * cellSize;
    const winnerTop = winnerKingPosition[0] * cellSize;

    // Calcular las posiciones del rey perdedor (relativas al tablero)
    const loserLeft = loserKingPosition[1] * cellSize;
    const loserTop = loserKingPosition[0] * cellSize;

    console.log("Coordenadas del rey ganador:", winnerLeft, winnerTop);
    console.log("Coordenadas del rey perdedor:", loserLeft, loserTop);

    // Posicionar la animación de Winner sobre la casilla del rey ganador
    winner.style.position = "absolute";
    winner.style.left = `${winnerLeft}px`;
    winner.style.top = `${winnerTop}px`;
    winner.style.width = `${cellSize}px`;
    winner.style.height = `${cellSize}px`;
    winner.classList.remove("hidden");

    // Posicionar la animación de Checkmate sobre la casilla del rey perdedor
    checkmate.style.position = "absolute";
    checkmate.style.left = `${loserLeft}px`;
    checkmate.style.top = `${loserTop}px`;
    checkmate.style.width = `${cellSize}px`;
    checkmate.style.height = `${cellSize}px`;
    checkmate.classList.remove("hidden");

    console.log("Posición del rey ganador:", winnerKingPosition);
    console.log("Posición del rey perdedor:", loserKingPosition);
    console.log("Coordenadas calculadas para el ganador:", winnerLeft, winnerTop);
    console.log("Coordenadas calculadas para el perdedor:", loserLeft, loserTop);

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

    if (result.moves.length > 0) {
        const cell = document.querySelector(`.cell[data-pos="${row},${col}"]`);
        cell.classList.add("selected-cell");

        result.moves.forEach(([r, c]) => {
            const targetCell = document.querySelector(`.cell[data-pos="${r},${c}"]`);
            targetCell.classList.add("legal-move");
        });
    }
}
function clearHighlights(excludeLastMove = false) {
    document.querySelectorAll(".cell").forEach(cell => {
        if (excludeLastMove) {
            console.log("Excluyendo resaltados del último movimiento");
            // No eliminar los resaltados del último movimiento
            if (cell.classList.contains("highlight-origin") || cell.classList.contains("highlight-destination")) {
                return;
            }
        }
        console.log("Limpiando resaltados de la celda:", cell.dataset.pos);
        cell.classList.remove("selected-cell", "legal-move", "highlight-origin", "highlight-destination");
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

        // Restablecer el estado del juego
        currentTurn = data.turn; // Reiniciar el turno actual
        gameOver = false; // Asegurarse de que el juego no esté marcado como terminado
        // Ocultar las animaciones y restablecer sus propiedades
        const winner = document.getElementById("winner");
        const checkmate = document.getElementById("checkmate");

        winner.classList.remove("shrink", "winner-final", "hidden");
        checkmate.classList.remove("shrink", "checkmate-final", "hidden");
        winner.classList.add("hidden");
        winner.style.left = "";
        winner.style.top = "";
        winner.style.width = "";
        winner.style.height = "";
        winner.querySelector("span").style.opacity = "1";

        checkmate.style.left = "";
        checkmate.style.top = "";
        checkmate.style.width = "";
        checkmate.style.height = "";
        checkmate.classList.add("hidden");
        checkmate.querySelector("span").style.opacity = "1";

        // Ocultar las animaciones de empate y restablecer sus propiedades
        const drawBlack = document.getElementById("draw-black");
        const drawWhite = document.getElementById("draw-white");

        drawBlack.classList.remove("shrink", "draw-final", "hidden");
        drawWhite.classList.remove("shrink", "draw-final", "hidden");
        drawBlack.classList.add("hidden");
        drawWhite.classList.add("hidden");
        drawBlack.style.left = "";
        drawBlack.style.top = "";
        drawBlack.style.width = "";
        drawBlack.style.height = "";
        drawBlack.querySelector("span").style.opacity = "1";

        drawWhite.style.left = "";
        drawWhite.style.top = "";
        drawWhite.style.width = "";
        drawWhite.style.height = "";
        drawWhite.querySelector("span").style.opacity = "1";
        // Reiniciar los temporizadores
        whiteTime = 600; // 10 minutos en segundos
        blackTime = 600;
        clearInterval(timerInterval); // Detener cualquier temporizador activo
        startTimer(); // Reiniciar el temporizador
        //esconder el boton de reiniciar partida
        document.getElementById("reset-game").classList.add("hidden");
        console.log("Animaciones revertidas.");
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