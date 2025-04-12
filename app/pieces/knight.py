class Knight:
    def __init__(self, color):
        self.color = color
        self.name = "N"

    def get_legal_moves(self, pos, board, last_move):
        x, y = pos
        moves = []

        # Movimientos del caballo
        knight_moves = [
            (x + 2, y + 1), (x + 2, y - 1), (x - 2, y + 1), (x - 2, y - 1),
            (x + 1, y + 2), (x + 1, y - 2), (x - 1, y + 2), (x - 1, y - 2)
        ]

        for move in knight_moves:
            if 0 <= move[0] < 8 and 0 <= move[1] < 8:
                target = board[move[0]][move[1]]
                if target is None or target.color != self.color:
                    moves.append(move)

        return moves