from app.pieces.piece import Piece
from app.pieces.rook import Rook
class King(Piece):
    def __init__(self, color):
        super().__init__(color)
        self.name = "K"
        self.has_moved = False

    def get_legal_moves(self, pos, board, last_move):
        x, y = pos
        moves = []

        # Movimientos normales del rey
        directions = [(-1, -1), (-1, 0), (-1, 1),
                      (0, -1),          (0, 1),
                      (1, -1), (1, 0), (1, 1)]

        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if self.in_bounds(nx, ny):
                target = board[nx][ny]
                if not target or target.color != self.color:
                    moves.append((nx, ny))

        # Verificar enroque
        if not self.has_moved:
            row = 7 if self.color == "white" else 0

            # Enroque corto
            if isinstance(board[row][7], Rook) and not board[row][7].has_moved:
                if not board[row][5] and not board[row][6]:
                    moves.append((row, 6))

            # Enroque largo
            if isinstance(board[row][0], Rook) and not board[row][0].has_moved:
                if not board[row][1] and not board[row][2] and not board[row][3]:
                    moves.append((row, 2))

        return moves

    def in_bounds(self, x, y):
        """Verifica si las coordenadas están dentro del tablero."""
        return 0 <= x < 8 and 0 <= y < 8