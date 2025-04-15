from app.pieces.rook import Rook
class King:
    def __init__(self, color):
        self.color = color
        self.name = "K"
        self.has_moved = False

    def get_legal_moves(self, pos, board, last_move):
        x, y = pos
        moves = []

        # Movimientos normales del rey
        directions = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if 0 <= nx < 8 and 0 <= ny < 8:
                target = board[nx][ny]
                if target is None or target.color != self.color:
                    moves.append((nx, ny))

        # Verificar enroque
        if not self.has_moved:
            row = x  # La fila del rey no cambia
            # Enroque corto (hacia la derecha)
            if (
                board[row][y + 1] is None and
                board[row][y + 2] is None and
                isinstance(board[row][y + 3], Rook) and
                not board[row][y + 3].has_moved
            ):
                moves.append((row, y + 2))

            # Enroque largo (hacia la izquierda)
            if (
                board[row][y - 1] is None and
                board[row][y - 2] is None and
                board[row][y - 3] is None and
                isinstance(board[row][y - 4], Rook) and
                not board[row][y - 4].has_moved
            ):
                moves.append((row, y - 2))

        return moves