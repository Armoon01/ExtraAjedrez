from app.pieces.piece import Piece

class Rook(Piece):
    def __init__(self, color):
        super().__init__(color)
        self.name = "R" if color == "white" else "r"
        self.type = "r"

    def get_legal_moves(self, position, board, last_move=None):
        x, y = position
        moves = []
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]  # vertical y horizontal

        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            while self.in_bounds(nx, ny):
                target = board[nx][ny]
                if target is None:
                    moves.append((nx, ny))
                else:
                    if target.color != self.color:
                        moves.append((nx, ny))
                    break
                nx += dx
                ny += dy

        return moves

    def in_bounds(self, x, y):
        return 0 <= x < 8 and 0 <= y < 8
