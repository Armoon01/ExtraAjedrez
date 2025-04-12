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

        if not piece or piece.color != self.current_turn:
            return False  # 👈 No permitir mover si no es el turno

        legal_moves = piece.get_legal_moves((x1, y1), self.board, self.last_move)
        if (x2, y2) in legal_moves:
            self.board[x2][y2] = piece
            self.board[x1][y1] = None
            self.last_move = {
                "from": from_pos,
                "to": to_pos,
                "piece": piece.name
            }
            # 👇 Cambiar el turno al jugador contrario
            self.current_turn = "black" if self.current_turn == "white" else "white"
            return True
        return False

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

    def print_board(self):
        for row in self.board:
            print(" ".join(piece.name if piece else "." for piece in row))
