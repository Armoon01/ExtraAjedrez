class Queen:
    def __init__(self, color):
        self.color = color
        self.name = "Q"

    def get_legal_moves(self, pos, board, last_move):
        x, y = pos
        moves = []

        # Movimientos diagonales y rectos
        directions = [
            (-1, -1), (-1, 1), (1, -1), (1, 1),  # Diagonales
            (-1, 0), (1, 0), (0, -1), (0, 1)    # Rectos
        ]
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            while 0 <= nx < 8 and 0 <= ny < 8:
                target = board[nx][ny]
                if target is None:
                    moves.append((nx, ny))
                elif target.color != self.color:
                    moves.append((nx, ny))
                    break
                else:
                    break
                nx += dx
                ny += dy

        return moves