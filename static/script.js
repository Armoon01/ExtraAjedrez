let selected = null;
let currentTurn = "white";
let gameOver = false;
let iaThinking = false; // Bandera para bloquear input mientras piensa la IA

// Espera a que el navegador pinte el DOM antes de animar
function waitNextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

async function loadBoard() {
    const res = await fetch('/api/board');
    const data = await res.json();
    currentTurn = data.turn;
    gameOver = data.game_over;

    if (gameOver) {
        updateEvalBar(data.eval);
        return;
    }

    renderBoard(data.board, data.king_in_check, data.last_move);
    document.getElementById("turn").innerText = "Turno: " + currentTurn;
    updateEvalBar(data.eval); 
}

function renderBoard(board, kingInCheck = null, last_move) {
    const boardDiv = document.getElementById('board');

    // --- GUARDAR DIVS DE ANIMACIÓN ---
    const winnerDiv = document.getElementById("winner");
    const checkmateDiv = document.getElementById("checkmate");
    const drawBlackDiv = document.getElementById("draw-black");
    const drawWhiteDiv = document.getElementById("draw-white");

    const animDivs = [];
    if (winnerDiv) animDivs.push(winnerDiv);
    if (checkmateDiv) animDivs.push(checkmateDiv);
    if (drawBlackDiv) animDivs.push(drawBlackDiv);
    if (drawWhiteDiv) animDivs.push(drawWhiteDiv);

    // --- LIMPIAR SOLO LAS CELDAS ---
    Array.from(boardDiv.children).forEach(child => {
        if (!animDivs.includes(child)) boardDiv.removeChild(child);
    });

    // --- CREAR CELDAS DEL TABLERO ---
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (document.querySelector(`.cell[data-pos="${i},${j}"]`)) continue;

            const cell = document.createElement('div');
            cell.className = 'cell ' + ((i + j) % 2 === 0 ? 'white' : 'black');
            cell.dataset.pos = `${i},${j}`;

            const piece = board[i][j];
            if (piece) {
                const pieceImg = document.createElement('img');
                pieceImg.src = `/static/images/${piece.color[0]}${piece.type}.png`;
                pieceImg.className = 'piece-img';
                pieceImg.draggable = piece.color === currentTurn && !iaThinking;

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

    // --- RE-INSERTAR LOS DIVS DE ANIMACIÓN (si no están ya) ---
    animDivs.forEach(div => {
        if (!boardDiv.contains(div)) boardDiv.appendChild(div);
    });
}

function handleDragStart(e, x, y) {
    if (gameOver || iaThinking) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({ from: [x, y] }));
    e.dataTransfer.effectAllowed = "move";
    selected = [x, y];
    clearHighlights(true);
    showLegalMoves(x, y);

    const img = new Image();
    img.src = '';
    e.dataTransfer.setDragImage(img, 0, 0);

    e.target.classList.add("dragging");
}

function handleDragEnd(e) {
    e.target.classList.remove("dragging");
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
}

async function handleDrop(e, x, y) {
    e.preventDefault();
    if (iaThinking) return;
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    const from = JSON.parse(data).from;
    const to = [x, y];
    await attemptMove(from, to);
}

async function handleClick(x, y) {
    if (gameOver || iaThinking) return;
    const cell = document.querySelector(`.cell[data-pos="${x},${y}"]`);
    const pieceImg = cell.querySelector("img");
    const res = await fetch('/api/board');
    const data = await res.json();
    const piece = data.board[x][y];

    if (!selected) {
        if (!pieceImg || !piece || piece.color !== currentTurn) return;
        selected = [x, y];
        clearHighlights(true);
        await showLegalMoves(x, y);
    } else {
        if (piece && piece.color === currentTurn) {
            selected = [x, y];
            clearHighlights(true);
            await showLegalMoves(x, y);
            return;
        }
        await attemptMove(selected, [x, y]);
    }
}

function showPromotionMenu(result, from, to) {
    const modal = document.getElementById("promotion-menu");
    const promotionColor = result.promotion_piece_color; // Asegúrate de que tu backend envía esto

    // Mapeo de nombres de piezas a sufijos de imágenes
    const pieceImageMap = {
        queen: "q",
        rook: "r",
        bishop: "b",
        knight: "n"
    };

    // Actualizar imágenes en el menú
    const buttons = document.querySelectorAll(".promotion-option");
    buttons.forEach(button => {
        const pieceType = button.dataset.piece;
        const pieceImg = button.querySelector("img");
        const imageSuffix = pieceImageMap[pieceType];
        pieceImg.src = `/static/images/${promotionColor[0]}${imageSuffix}.png`;
        pieceImg.alt = `${promotionColor} ${pieceType}`;
    });

    // --- Adaptación para IA ---
    if (promotionColor === "black") { // Cambia a "white" si tu IA es blanca
        // La IA siempre elige dama automáticamente (puedes cambiar "queen" por otra)
        const promotionChoice = "queen";
        modal.classList.add("hidden"); // No mostrar el modal para la IA
        promoteAutomatically(from, to, promotionChoice);
        return;
    }

    // --- Para el jugador humano ---
    modal.classList.remove("hidden");
    buttons.forEach(button => {
        button.onclick = async () => {
            const promotionChoice = button.dataset.piece;
            await promoteAutomatically(from, to, promotionChoice);
            modal.classList.add("hidden");
        };
    });

    document.getElementById("close-promotion-menu").onclick = () => {
        modal.classList.add("hidden");
    };
}

// Función auxiliar para enviar la promoción
async function promoteAutomatically(from, to, promotionChoice) {
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
        await loadBoard();
    }
}

async function attemptMove(from, to) {
    if (iaThinking) return;
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

    clearHighlights();

    const originCell = document.querySelector(`.cell[data-pos="${from[0]},${from[1]}"]`);
    const destinationCell = document.querySelector(`.cell[data-pos="${to[0]},${to[1]}"]`);
    if (originCell) originCell.classList.add("highlight-origin");
    if (destinationCell) destinationCell.classList.add("highlight-destination");

    await loadBoard();

    if (result.promotion_required) {
        showPromotionMenu(result, from, to);
        return;
    }

    if (result.game_over) {
        renderBoard(result.board, null, result.last_move);
        await waitNextFrame(); // Espera a que el DOM pinte el movimiento ganador
        if(result.stalemate) {
            const blackKingPosition = result.black_king_position;
            const whiteKingPosition = result.white_king_position;
            showStalemateAnimation(blackKingPosition, whiteKingPosition);
        }
        else if (result.king_position && result.loser_king_position) {
            showCheckmateAnimation(result.king_position, result.loser_king_position);
        }
        clearInterval(timerInterval);
        document.getElementById("reset-game").classList.remove("hidden");
        return;
    }

    currentTurn = result.turn;
    switchTimer();

    if (result.last_move) {
        const lastOrigin = document.querySelector(`.cell[data-pos="${result.last_move.from[0]},${result.last_move.from[1]}"]`);
        const lastDestination = document.querySelector(`.cell[data-pos="${result.last_move.to[0]},${result.last_move.to[1]}"]`);
        if (lastOrigin) lastOrigin.classList.add("highlight-origin");
        if (lastDestination) lastDestination.classList.add("highlight-destination");
    }

    // Si es el turno de la IA (por ejemplo, negras), llama a iaMove
    if (!result.game_over && currentTurn === "black") { // Cambia "black" por "white" si la IA juega con blancas
        await iaMove();
    }
}

async function iaMove() {
    iaThinking = true;
    try {
        const res = await fetch('/api/ia_move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ color: currentTurn, profundidad: 2 }) // Ajusta profundidad si quieres
        });
        const result = await res.json();

        // Si la IA no puede mover o hay error
        if (!result.success) {
            iaThinking = false;
            alert(result.message || "La IA no puede mover.");
            return;
        }

        // Sonido según el tipo de jugada
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

        // Resalta movimiento realizado
        if (result.from && result.to) {
            clearHighlights();
            const originCell = document.querySelector(`.cell[data-pos="${result.from[0]},${result.from[1]}"]`);
            const destinationCell = document.querySelector(`.cell[data-pos="${result.to[0]},${result.to[1]}"]`);
            if (originCell) originCell.classList.add("highlight-origin");
            if (destinationCell) destinationCell.classList.add("highlight-destination");
        }

        // Actualiza tablero y eval bar
        await loadBoard();

        if (result.game_over) {
            renderBoard(result.board, null, result.last_move);
            await waitNextFrame(); // Espera a que el DOM pinte el movimiento ganador
            if (result.stalemate) {
                showStalemateAnimation(result.black_king_position, result.white_king_position);
            } else if (result.king_position && result.loser_king_position) {
                showCheckmateAnimation(result.king_position, result.loser_king_position);
            }
            clearInterval(timerInterval);
            document.getElementById("reset-game").classList.remove("hidden");
        } else {
            // Actualiza turno y timer solo si no terminó
            currentTurn = result.turn;
            switchTimer();
        }
    } catch (error) {
        alert("Error en el movimiento de la IA.");
        console.error(error);
    }
    iaThinking = false;
}

function showStalemateAnimation(blackKingPosition, whiteKingPosition) {
    const board = document.getElementById('board');
    const boardRect = board.getBoundingClientRect();
    const cellSize = boardRect.width / 8;

    const drawBlack = document.getElementById("draw-black");
    const drawWhite = document.getElementById("draw-white");

    // Ubica los overlays exactamente sobre la casilla del rey (tamaño igual a la casilla)
    drawBlack.style.position = "absolute";
    drawBlack.style.left = `${blackKingPosition[1] * cellSize}px`;
    drawBlack.style.top = `${blackKingPosition[0] * cellSize}px`;
    drawBlack.style.width = `${cellSize}px`;
    drawBlack.style.height = `${cellSize}px`;
    drawBlack.classList.remove("hidden", "shrink", "draw-final");

    drawWhite.style.position = "absolute";
    drawWhite.style.left = `${whiteKingPosition[1] * cellSize}px`;
    drawWhite.style.top = `${whiteKingPosition[0] * cellSize}px`;
    drawWhite.style.width = `${cellSize}px`;
    drawWhite.style.height = `${cellSize}px`;
    drawWhite.classList.remove("hidden", "shrink", "draw-final");

    // Espera y luego sólo cambia a bola (NO cambies tamaño ni posición)
    setTimeout(() => {
        drawBlack.classList.add("shrink", "draw-final");
        drawWhite.classList.add("shrink", "draw-final");
        drawBlack.querySelector("span").style.opacity = "0";
        drawWhite.querySelector("span").style.opacity = "0";
    }, 3000);
}

function showCheckmateAnimation(winnerKingPosition, loserKingPosition) {
    const board = document.getElementById('board');
    const boardRect = board.getBoundingClientRect();
    const cellSize = boardRect.width / 8;

    const winner = document.getElementById("winner");
    const checkmate = document.getElementById("checkmate");

    // Ubica los overlays exactamente sobre la casilla del rey (tamaño igual a la casilla)
    winner.style.position = "absolute";
    winner.style.left = `${winnerKingPosition[1] * cellSize}px`;
    winner.style.top = `${winnerKingPosition[0] * cellSize}px`;
    winner.style.width = `${cellSize}px`;
    winner.style.height = `${cellSize}px`;
    winner.classList.remove("hidden", "shrink", "winner-final");

    checkmate.style.position = "absolute";
    checkmate.style.left = `${loserKingPosition[1] * cellSize}px`;
    checkmate.style.top = `${loserKingPosition[0] * cellSize}px`;
    checkmate.style.width = `${cellSize}px`;
    checkmate.style.height = `${cellSize}px`;
    checkmate.classList.remove("hidden", "shrink", "checkmate-final");

    // Espera y luego sólo cambia a bola (NO cambies tamaño ni posición)
    setTimeout(() => {
        winner.classList.add("shrink", "winner-final");
        checkmate.classList.add("shrink", "checkmate-final");
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
            if (cell.classList.contains("highlight-origin") || cell.classList.contains("highlight-destination")) {
                return;
            }
        }
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
        renderBoard(data.board);
        document.getElementById("turn").innerText = "Turno: " + data.turn;
        currentTurn = data.turn;
        gameOver = false;

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

        whiteTime = 600;
        blackTime = 600;
        clearInterval(timerInterval);
        startTimer();
        document.getElementById("reset-game").classList.add("hidden");
    }
});

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

function updateEvalBar(score) {
    // Limita el score entre -10 y +10
    const capped = Math.max(-10, Math.min(10, score));
    const percent = ((capped + 10) / 20) * 100;
    const bar = document.getElementById('eval-bar-score');
    bar.style.height = percent + "%";

    // Score flotante
    const floatScore = document.getElementById('eval-score-float');
    let display;
    if (score > 9.5) display = "M";
    else if (score < -9.5) display = "-M";
    else display = (score > 0 ? "+" : "") + score.toFixed(1);

    floatScore.textContent = display;
}