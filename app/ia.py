from copy import deepcopy

def opuesto(color):
    return "black" if color == "white" else "white"

def evaluar_tablero(chessboard):
    # Detecta mate para ambos bandos: -1000 si el jugador actual está en mate, +1000 si el rival está en mate
    if hasattr(chessboard, "is_checkmate"):
        if chessboard.is_checkmate():
            return -1000
        # Comprobar si el rival está en mate (mate a favor de la IA)
        original_turn = chessboard.current_turn
        rival = opuesto(original_turn)
        chessboard.current_turn = rival
        mate_rival = chessboard.is_checkmate()
        chessboard.current_turn = original_turn
        if mate_rival:
            return 1000

    valores = {
        'p': 1.0,
        'n': 3.2,
        'b': 3.35,
        'r': 5.0,
        'q': 9.0,
        'k': 0.0
    }
    puntaje = 0
    desarrollo = 0
    centro = 0
    movilidad = 0
    amenazas = 0
    colgadas = 0
    enroque_bonus = 0
    peon_avanzado = 0
    peon_pasado = 0
    doblados = 0
    aislados = 0
    promocion = 0
    agresion = 0
    intercambio = 0

    centros = {(3,3), (3,4), (4,3), (4,4), (2,3), (2,4), (3,2), (4,2), (5,3), (5,4), (3,5), (4,5)}

    def rey_enrocado(tablero, color):
        if color == "white":
            return (tablero.board[7][6] and tablero.board[7][6].name.lower() == "k") or \
                   (tablero.board[7][2] and tablero.board[7][2].name.lower() == "k")
        else:
            return (tablero.board[0][6] and tablero.board[0][6].name.lower() == "k") or \
                   (tablero.board[0][2] and tablero.board[0][2].name.lower() == "k")

    atacadas_white = set()
    atacadas_black = set()
    defendidas_white = set()
    defendidas_black = set()
    peones_white = [[] for _ in range(8)]
    peones_black = [[] for _ in range(8)]

    # Fase 1: calcula casillas atacadas/defendidas
    for x in range(8):
        for y in range(8):
            pieza = chessboard.board[x][y]
            if pieza:
                moves = pieza.get_legal_moves((x, y), chessboard.board, chessboard.last_move)
                for move in moves:
                    if pieza.color == "white":
                        atacadas_white.add(tuple(move))
                        if chessboard.board[move[0]][move[1]] and chessboard.board[move[0]][move[1]].color == "white":
                            defendidas_white.add(tuple(move))
                    else:
                        atacadas_black.add(tuple(move))
                        if chessboard.board[move[0]][move[1]] and chessboard.board[move[0]][move[1]].color == "black":
                            defendidas_black.add(tuple(move))
                # Para peones pasados, aislados y doblados
                if pieza.name.lower() == 'p':
                    if pieza.color == "white":
                        peones_white[y].append(x)
                    else:
                        peones_black[y].append(x)

    # Estructura de peones: aislados, doblados, pasados
    for color, peones in [("white", peones_white), ("black", peones_black)]:
        for col in range(8):
            fila_peones = peones[col]
            # Doblados
            if len(fila_peones) > 1:
                doblados += (-0.25 if color == "white" else 0.25) * (len(fila_peones)-1)
            # Aislados
            aislado = True
            if col > 0 and peones[col-1]:
                aislado = False
            if col < 7 and peones[col+1]:
                aislado = False
            if aislado and fila_peones:
                aislados += (-0.2 if color == "white" else 0.2) * len(fila_peones)
            # Peón pasado
            if fila_peones:
                is_passed = True
                my_rows = fila_peones
                for other_col in [col-1, col, col+1]:
                    if other_col < 0 or other_col > 7:
                        continue
                    others = peones_black[other_col] if color == "white" else peones_white[other_col]
                    for other_row in others:
                        if (color == "white" and other_row < min(my_rows)) or (color == "black" and other_row > max(my_rows)):
                            is_passed = False
                if is_passed:
                    peon_pasado += (0.3 if color == "white" else -0.3) * len(fila_peones)

    # Fase 2: evalúa piezas y agresividad
    for x in range(8):
        for y in range(8):
            pieza = chessboard.board[x][y]
            if pieza:
                val = valores.get(pieza.name.lower(), 0)
                color_sign = 1 if pieza.color == "white" else -1
                puntaje += val * color_sign

                # Desarrollo: bonifica piezas avanzadas
                if pieza.name.lower() in ['n', 'b']:
                    if (pieza.color == "white" and x < 6) or (pieza.color == "black" and x > 1):
                        desarrollo += 0.18 * color_sign

                # Centro
                if pieza.name.lower() == 'p' and (x, y) in centros:
                    centro += 0.17 * color_sign

                # Movilidad real (más peso para piezas mayores)
                moves = chessboard.get_legal_moves((x, y), chessboard.board, chessboard.last_move)
                move_mult = 0.09 if pieza.name.lower() in ['q', 'r'] else 0.06
                if pieza.name.lower() in ['n', 'b', 'r', 'q']:
                    movilidad += move_mult * len(moves) * color_sign

                # Rey expuesto
                if pieza.name.lower() == 'k':
                    if (pieza.color == "white" and x < 2) or (pieza.color == "black" and x > 5):
                        puntaje -= 0.33 * color_sign

                # Rey enrocado
                if pieza.name.lower() == 'k' and rey_enrocado(chessboard, pieza.color):
                    enroque_bonus += 0.45 * color_sign

                # Capturas posibles y amenazas
                if pieza.color == "white":
                    if (x, y) in atacadas_black:
                        amenazas += val * 0.35
                        objetivo = chessboard.board[x][y]
                        if objetivo and objetivo.color == "black":
                            agresion += valores.get(objetivo.name.lower(), 0) * 0.15
                    if (x, y) in atacadas_black and (x, y) not in defendidas_white:
                        colgadas -= val * 0.8
                else:
                    if (x, y) in atacadas_white:
                        amenazas -= val * 0.35
                        objetivo = chessboard.board[x][y]
                        if objetivo and objetivo.color == "white":
                            agresion -= valores.get(objetivo.name.lower(), 0) * 0.15
                    if (x, y) in atacadas_white and (x, y) not in defendidas_black:
                        colgadas += val * 0.8

                # Peón avanzado (7a/2a fila)
                if pieza.name.lower() == 'p':
                    if (pieza.color == "white" and x == 1):
                        peon_avanzado += 0.18
                    if (pieza.color == "black" and x == 6):
                        peon_avanzado -= 0.18
                # Promoción
                if pieza.name.lower() == 'p':
                    if (pieza.color == "white" and x == 0):
                        promocion += 0.9
                    if (pieza.color == "black" and x == 7):
                        promocion -= 0.9

                # Nueva: bonifica capturas (intercambio)
                for move in moves:
                    target = chessboard.board[move[0]][move[1]]
                    if target and target.color != pieza.color:
                        intercambio += 0.25 * valores.get(target.name.lower(), 0) * color_sign

    # Pareja de alfiles
    for color in ["white", "black"]:
        bishops = 0
        for x in range(8):
            for y in range(8):
                pieza = chessboard.board[x][y]
                if pieza and pieza.color == color and pieza.name.lower() == 'b':
                    bishops += 1
        if bishops >= 2:
            puntaje += 0.22 if color == "white" else -0.22

    return (puntaje + desarrollo + centro + movilidad + amenazas +
            colgadas + enroque_bonus + peon_avanzado + peon_pasado +
            promocion + doblados + aislados + agresion + intercambio)

def obtener_todos_los_movimientos_legales(chessboard, color):
    movimientos = []
    for x in range(8):
        for y in range(8):
            pieza = chessboard.board[x][y]
            if pieza and pieza.color == color:
                legal_moves = chessboard.get_legal_moves((x, y), chessboard.board, chessboard.last_move)
                for move in legal_moves:
                    captura = chessboard.board[move[0]][move[1]] is not None
                    movimientos.append(((x, y), move, captura))
    movimientos.sort(key=lambda m: m[2], reverse=True)
    return [(m[0], m[1]) for m in movimientos]

def aplicar_movimiento(chessboard, from_pos, to_pos):
    nuevo_tablero = deepcopy(chessboard)
    pieza = chessboard.board[from_pos[0]][from_pos[1]]
    if pieza and pieza.name.lower() == "p" and (to_pos[0] == 0 or to_pos[0] == 7):
        nuevo_tablero.move_piece(from_pos, to_pos, promotion_choice="queen")
    else:
        nuevo_tablero.move_piece(from_pos, to_pos)
    return nuevo_tablero

def minimax(chessboard, profundidad, color_actual, color_ia, alpha=float('-inf'), beta=float('inf')):
    if profundidad == 0 or chessboard.is_game_over():
        eval_score = evaluar_tablero(chessboard)
        return (eval_score if color_ia == "white" else -eval_score), None

    movimientos = obtener_todos_los_movimientos_legales(chessboard, color_actual)
    mejor_mov = None

    if color_actual == color_ia:
        max_eval = float('-inf')
        for from_pos, to_pos in movimientos:
            nuevo_tab = aplicar_movimiento(chessboard, from_pos, to_pos)
            eval_score, _ = minimax(nuevo_tab, profundidad-1, opuesto(color_actual), color_ia, alpha, beta)
            if eval_score > max_eval:
                max_eval = eval_score
                mejor_mov = (from_pos, to_pos)
            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break
        return max_eval, mejor_mov
    else:
        min_eval = float('inf')
        for from_pos, to_pos in movimientos:
            nuevo_tab = aplicar_movimiento(chessboard, from_pos, to_pos)
            eval_score, _ = minimax(nuevo_tab, profundidad-1, opuesto(color_actual), color_ia, alpha, beta)
            if eval_score < min_eval:
                min_eval = eval_score
                mejor_mov = (from_pos, to_pos)
            beta = min(beta, eval_score)
            if beta <= alpha:
                break
        return min_eval, mejor_mov

def obtener_mejor_movimiento(chessboard, profundidad, color):
    _, mejor_mov = minimax(chessboard, profundidad, color, color)
    return mejor_mov