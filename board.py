from app.pieces.pawn import Pawn
from app.pieces.knight import Knight
from app.pieces.bishop import Bishop
from app.pieces.rook import Rook
from app.pieces.queen import Queen
from app.pieces.king import King
# Importar las piezas que necesites
# Más adelante: from pieces.rook import Rook, etc.

class ChessBoard:
    def __init__(self):
        self.board = self.create_board()
        self.current_turn = "white"  # Turno actual
        self.last_move = None  # Guardar info como {"from": (6,4), "to": (4,4), "piece": "P"}
    def get_legal_moves(self, pos):
        """Obtiene los movimientos legales de una pieza, verificando si el rey queda en jaque."""
        x, y = pos
        piece = self.board[x][y]

        if not piece:
            return []

        # Obtener los movimientos posibles de la pieza
        possible_moves = piece.get_legal_moves((x, y), self.board, self.last_move)

        # Filtrar los movimientos que dejan al rey en jaque
        legal_moves = []
        for move in possible_moves:
            from_pos = (x, y)
            to_pos = move

            # Simular el movimiento
            captured_piece = self.board[to_pos[0]][to_pos[1]]
            self.board[to_pos[0]][to_pos[1]] = piece
            self.board[x][y] = None

            # Verificar si el rey sigue en jaque
            if not self.is_in_check(piece.color):
                legal_moves.append(to_pos)

            # Deshacer el movimiento
            self.board[x][y] = piece
            self.board[to_pos[0]][to_pos[1]] = captured_piece

        return legal_moves
    def create_board(self):
        board = [[None for _ in range(8)] for _ in range(8)]

        # Peones blancos
        for y in range(8):
            board[6][y] = Pawn("white")

        # Peones negros
        for y in range(8):
            board[1][y] = Pawn("black")

        # Caballos blancos
        board[7][1] = Knight("white")
        board[7][6] = Knight("white")

        # Caballos negros
        board[0][1] = Knight("black")
        board[0][6] = Knight("black")
        # Alfiles blancos
        board[7][2] = Bishop("white")
        board[7][5] = Bishop("white")

        # Alfiles negros
        board[0][2] = Bishop("black")
        board[0][5] = Bishop("black")

        # Torres blancas
        board[7][0] = Rook("white")
        board[7][7] = Rook("white")

        # Torres negras
        board[0][0] = Rook("black")
        board[0][7] = Rook("black")

        # Reina blanca
        board[7][3] = Queen("white")

        # Reina negra
        board[0][3] = Queen("black")

        # Rey blanco
        board[7][4] = King("white")

        # Rey negro
        board[0][4] = King("black")


        # Aquí vas a agregar el resto de las piezas (torres, caballos, etc.)
        return board

    def move_piece(self, from_pos, to_pos):
        x1, y1 = from_pos
        x2, y2 = to_pos

        piece = self.board[x1][y1]

        # Validar si hay una pieza en la posición inicial y si es el turno correcto
        if not piece:
            return {
                "success": False,
                "message": "No hay ninguna pieza en la posición inicial.",
                "board": self.get_board_state()
            }
        if piece.color != self.current_turn:
            return {
                "success": False,
                "message": f"No es el turno de las piezas {piece.color}.",
                "board": self.get_board_state()
            }

        # Obtener los movimientos legales de la pieza
        legal_moves = self.get_legal_moves((x1, y1))
        if (x2, y2) not in legal_moves:
            return {
                "success": False,
                "message": "Movimiento no permitido.",
                "board": self.get_board_state()
            }

        # Manejar el enroque
        if isinstance(piece, King) and abs(y2 - y1) == 2:
            if not self.handle_castling(x1, y1, x2, y2):
                return {
                    "success": False,
                    "message": "Enroque no permitido.",
                    "board": self.get_board_state()
                }

        # Realizar el movimiento
        captured_piece = self.board[x2][y2]
        self.board[x2][y2] = piece
        self.board[x1][y1] = None

        # Marcar que el rey o la torre se han movido
        if isinstance(piece, (King, Rook)):
            piece.has_moved = True

        # Actualizar el último movimiento
        self.last_move = {
            "from": from_pos,
            "to": to_pos,
            "piece": piece.name
        }

        # Verificar si el movimiento deja al jugador en jaque
        if self.is_in_check(self.current_turn):
            # Deshacer el movimiento
            self.board[x1][y1] = piece
            self.board[x2][y2] = captured_piece
            return {
                "success": False,
                "message": "Movimiento inválido: el rey queda en jaque.",
                "board": self.get_board_state(),
                "in_check": True,
                "king_position": self.get_king_position(self.current_turn)
            }

        # Cambiar el turno
        self.current_turn = "black" if self.current_turn == "white" else "white"

        # Verificar si es jaque mate
        if self.is_checkmate(self.current_turn):
            return {
                "success": False,
                "message": "Jaque mate. El juego ha terminado.",
                "board": self.get_board_state(),
                "in_check": True,
                "king_position": self.get_king_position(self.current_turn)
            }

        return {
            "success": True,
            "message": "Movimiento realizado con éxito.",
            "board": self.get_board_state(),
            "turn": self.current_turn
        }
    def get_king_position(self, color):
        """Devuelve la posición del rey del color especificado."""
        for x in range(8):
            for y in range(8):
                piece = self.board[x][y]
                if piece and piece.name.lower() == 'k' and piece.color == color:
                    return (x, y)
        return None
    def handle_castling(self, x1, y1, x2, y2):
        """Maneja la lógica del enroque."""
        row = x1

        # Verificar si las casillas entre el rey y la torre están vacías
        if y2 == 6:  # Enroque corto
            if self.board[row][5] or self.board[row][6]:
                return False
        elif y2 == 2:  # Enroque largo
            if self.board[row][1] or self.board[row][2] or self.board[row][3]:
                return False

        # Verificar si el rey pasa por una casilla en jaque
        king_positions = [(row, y1), (row, (y1 + y2) // 2), (row, y2)]
        for pos in king_positions:
            self.board[x1][y1] = None  # Simular que el rey se mueve
            if self.is_in_check(self.current_turn):
                self.board[x1][y1] = self.board[row][y1]  # Restaurar el rey
                return False
            self.board[x1][y1] = self.board[row][y1]  # Restaurar el rey

        # Mover la torre
        if y2 == 6:  # Enroque corto
            rook = self.board[row][7]
            self.board[row][5] = rook
            self.board[row][7] = None
        elif y2 == 2:  # Enroque largo
            rook = self.board[row][0]
            self.board[row][3] = rook
            self.board[row][0] = None

        rook.has_moved = True
        return True
    def get_board_state(self):
        state = []
        for row in self.board:
            state_row = []
            for piece in row:
                if piece:
                    state_row.append({
                        "color": piece.color,
                        "type": piece.name.lower()
                    })
                else:
                    state_row.append(None)
            state.append(state_row)
        return state
    def is_in_check(self, color):
        """Verifica si el rey del color dado está en jaque."""
        king_pos = self.get_king_position(color)
        if not king_pos:
            return False

        for x in range(8):
            for y in range(8):
                piece = self.board[x][y]
                if piece and piece.color != color:
                    if king_pos in piece.get_legal_moves((x, y), self.board, self.last_move):
                        return True
        return False
    def is_checkmate(self, color):
        # Si no está en jaque, no es jaque mate
        if not self.is_in_check(color):
            return False

        # Intentar todos los movimientos posibles de todas las piezas del jugador
        for x in range(8):
            for y in range(8):
                piece = self.board[x][y]
                if piece and piece.color == color:
                    legal_moves = piece.get_legal_moves((x, y), self.board, self.last_move)
                    for move in legal_moves:
                        x2, y2 = move

                        # Simular movimiento
                        captured_piece = self.board[x2][y2]
                        self.board[x2][y2] = piece
                        self.board[x][y] = None

                        in_check = self.is_in_check(color)

                        # Deshacer movimiento
                        self.board[x][y] = piece
                        self.board[x2][y2] = captured_piece

                        # Si hay al menos un movimiento que evita el jaque, no es jaque mate
                        if not in_check:
                            return False

        return True  # No hay forma de salir del jaque → es jaque mate
    def print_board(self):
        for row in self.board:
            print(" ".join(piece.name if piece else "." for piece in row))
