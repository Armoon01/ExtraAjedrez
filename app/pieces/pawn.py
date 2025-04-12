# filepath: c:\Users\lunai\OneDrive\Escritorio\Chess.com-1\app\pieces\pawn.py
class Pawn:
    def __init__(self, color):
        self.color = color
        self.name = "P"

    def get_legal_moves(self, pos, board, last_move):
        x, y = pos
        moves = []

        # Movimiento hacia adelante
        if self.color == "white":
            if x > 0 and board[x - 1][y] is None:
                moves.append((x - 1, y))
                if x == 6 and board[x - 2][y] is None:
                    moves.append((x - 2, y))
        else:  # Black
            if x < 7 and board[x + 1][y] is None:
                moves.append((x + 1, y))
                if x == 1 and board[x + 2][y] is None:
                    moves.append((x + 2, y))

        # Capturas diagonales
        if self.color == "white":
            if x > 0 and y > 0 and board[x - 1][y - 1] and board[x - 1][y - 1].color == "black":
                moves.append((x - 1, y - 1))
            if x > 0 and y < 7 and board[x - 1][y + 1] and board[x - 1][y + 1].color == "black":
                moves.append((x - 1, y + 1))
        else:  # Black
            if x < 7 and y > 0 and board[x + 1][y - 1] and board[x + 1][y - 1].color == "white":
                moves.append((x + 1, y - 1))
            if x < 7 and y < 7 and board[x + 1][y + 1] and board[x + 1][y + 1].color == "white":
                moves.append((x + 1, y + 1))

        # Captura al paso
        if last_move:
            last_from, last_to, last_piece = last_move
            if isinstance(last_piece, Pawn) and abs(last_from[0] - last_to[0]) == 2:
                if self.color == "white" and x == 3 and abs(y - last_to[1]) == 1:
                    moves.append((2, last_to[1]))
                elif self.color == "black" and x == 4 and abs(y - last_to[1]) == 1:
                    moves.append((5, last_to[1]))

        return moves