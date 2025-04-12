from app.pieces.piece import Piece

class Knight(Piece):
    def __init__(self, color):
        super().__init__(color)
        self.name = "N" if color == "white" else "n"
        self.type = "n"

    def get_legal_moves(self, position, board, last_move=None):
        x, y = position
        directions = [
            (2, 1), (2, -1), (-2, 1), (-2, -1),
            (1, 2), (1, -2), (-1, 2), (-1, -2)
        ]
        moves = []

        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if self.in_bounds(nx, ny):
                target = board[nx][ny]
                if target is None or target.color != self.color:
                    moves.append((nx, ny))

        return moves

    def in_bounds(self, x, y):
        return 0 <= x < 8 and 0 <= y < 8