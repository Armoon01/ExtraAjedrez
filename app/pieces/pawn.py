from app.pieces.piece import Piece

class Pawn(Piece):
    def __init__(self, color):
        super().__init__(color)
        self.name = "P" if color == "white" else "p"

    def get_legal_moves(self, position, board, last_move=None):
        x, y = position
        direction = -1 if self.color == "white" else 1
        moves = []

        # Movimiento hacia adelante (una casilla)
        if self.is_empty((x + direction, y), board):
            moves.append((x + direction, y))

            # Doble paso desde fila inicial
            start_row = 6 if self.color == "white" else 1
            if x == start_row and self.is_empty((x + 2 * direction, y), board):
                moves.append((x + 2 * direction, y))

        # Capturas en diagonal
        for dy in [-1, 1]:
            nx, ny = x + direction, y + dy
            if self.in_bounds(nx, ny):
                target = board[nx][ny]
                if target is not None and target.color != self.color:
                    moves.append((nx, ny))

                # Captura al paso
                if last_move and last_move["piece"] == "P" and abs(last_move["from"][0] - last_move["to"][0]) == 2:
                    if last_move["to"] == (x, y + dy):
                        moves.append((nx, ny))

        return moves

    def is_empty(self, pos, board):
        x, y = pos
        return self.in_bounds(x, y) and board[x][y] is None

    def in_bounds(self, x, y):
        return 0 <= x < 8 and 0 <= y < 8