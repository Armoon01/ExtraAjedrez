class King:
    def __init__(self, color):
        self.color = color
        self.name = "K"

    def get_legal_moves(self, pos, board, last_move):
        x, y = pos
        moves = []

        # Movimientos del rey (una casilla en cualquier dirección)
        king_moves = [
            (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1),
            (x + 1, y + 1), (x + 1, y - 1), (x - 1, y + 1), (x - 1, y - 1)
        ]

        for move in king_moves:
            if 0 <= move[0] < 8 and 0 <= move[1] < 8:
                target = board[move[0]][move[1]]
                if target is None or target.color != self.color:
                    moves.append(move)

        return moves