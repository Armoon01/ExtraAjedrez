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
                cell.innerHTML = pieceSymbol(piece);
            }

            if (kingInCheck && kingInCheck[0] === i && kingInCheck[1] === j) {
                cell.classList.add('blink');
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
    const fileName = `${piece.color[0]}${piece.type}.png`; 
    return `<img src="/static/images/${fileName}" class="piece-img">`;
}

function clearHighlights() {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.classList.remove("selected-cell", "legal-move");
    });
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
        // Si clicás en otra pieza propia, se actualiza la selección
        if (piece && piece.color === currentTurn) {
            selected = [x, y];
            clearHighlights();
            await showLegalMoves(x, y);
            return;
        }

        // Intentar mover
        const moveRes = await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: selected, to: [x, y] })
        });

        const result = await moveRes.json();

        if (!result.success) {
            if (result.move_does_not_cover_check) {
                const kingCell = document.querySelector(
                    `.cell[data-pos="${result.king_position[0]},${result.king_position[1]}"]`
                );
                if (kingCell) {
                    kingCell.classList.add('blink');
                    setTimeout(() => {
                        kingCell.classList.remove('blink');
                    }, 1000);
                }

                clearHighlights();
                await showLegalMoves(selected[0], selected[1]);

                // ❗ No limpiar la selección
                return;
            }

            // Si el error es otro, sí limpiamos
            selected = null;
            return;
        }

        // Movimiento válido
        await loadBoard();

        if (result.promotion_required) {
            showPromotionMenu(result, selected, [x, y]);
            return;
        }

        currentTurn = result.turn;
        switchTimer();
        selected = null;
    }
}

function showPromotionMenu(result, from, to) {
    const menu = document.getElementById("promotion-menu");
    menu.classList.remove("hidden");

    const pieceColor = result.promotion_piece_color;
    if (!pieceColor) {
        console.error("No se encontró el color de la pieza para la promoción.");
        return;
    }

    const promotionOptions = document.querySelectorAll(".promotion-option img");
    const pieceTypes = ["queen", "rook", "bishop", "knight"];
    promotionOptions.forEach((img, index) => {
        const pieceType = pieceTypes[index];
        img.src = `/static/images/${pieceColor[0]}${pieceType[0]}.png`;
        img.alt = `${pieceColor} ${pieceType}`;
    });

    document.querySelectorAll(".promotion-option").forEach((option, index) => {
        option.onclick = async () => {
            const promotionChoice = pieceTypes[index];

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

            menu.classList.add("hidden");
        };
    });

    document.getElementById("close-promotion-menu").onclick = () => {
        menu.classList.add("hidden");
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

let whiteTime = 600;
let blackTime = 600;
let currentTimer = "white";
let timerInterval;

function startTimer() {
    timerInterval = setInterval(() => {
        if (currentTimer === "white") {
            whiteTime--;
            updateTimerDisplay("white", whiteTime);
            rotateClock("white"); // Rotar la aguja del reloj blanco
            if (whiteTime <= 0) {
                clearInterval(timerInterval);
                alert("¡El tiempo del jugador blanco se ha agotado!");
            }
        } else {
            blackTime--;
            updateTimerDisplay("black", blackTime);
            rotateClock("black"); // Rotar la aguja del reloj negro
            if (blackTime <= 0) {
                clearInterval(timerInterval);
                alert("¡El tiempo del jugador negro se ha agotado!");
            }
        }
    }, 1000);
}

let whiteClockAngle = 0; // Ángulo inicial para el reloj blanco
let blackClockAngle = 0; // Ángulo inicial para el reloj negro

function rotateClock(player) {
    const clockHand = document.getElementById(`${player}-clock-hand`);
    if (!clockHand) {
        console.error(`No se encontró el elemento del reloj para ${player}`);
        return;
    }

    if (player === "white") {
        whiteClockAngle = (whiteClockAngle + 90) % 360; // Incrementar 90 grados por segundo
        clockHand.setAttribute("transform", `rotate(${whiteClockAngle} 50 50)`); // Rotar alrededor del centro (50, 50)
    } else {
        blackClockAngle = (blackClockAngle + 90) % 360; // Incrementar 90 grados por segundo
        clockHand.setAttribute("transform", `rotate(${blackClockAngle} 50 50)`); // Rotar alrededor del centro (50, 50)
    }
}

function updateTimerDisplay(player, time) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const timerElement = document.querySelector(`.${player}-timer`);
    timerElement.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
function switchTimer() {
    // Alternar el turno entre blanco y negro
    currentTimer = currentTimer === "white" ? "black" : "white";

    console.log("currentTimer", currentTimer);

    // Mostrar el reloj del jugador actual y ocultar el del otro jugador
    if (currentTimer === "white") {
        document.querySelector(".white-clock").classList.remove("hidden");
        document.querySelector(".black-clock").classList.add("hidden");
    } else {
        document.querySelector(".white-clock").classList.add("hidden");
        document.querySelector(".black-clock").classList.remove("hidden");
    }
}

window.onload = () => {
    loadBoard();
    startTimer();
    document.querySelector(".white-clock").classList.remove("hidden");
    document.querySelector(".black-clock").classList.add("hidden");
};
