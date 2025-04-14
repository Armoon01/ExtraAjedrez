from app.pieces.pawn import Pawn
from app.pieces.knight import Knight
from app.pieces.bishop import Bishop
from app.pieces.rook import Rook
from app.pieces.queen import Queen
from app.pieces.king import King

class ChessBoard:
    def __init__(self):
        self.board = self.create_board()
        self.current_turn = "white"
        self.last_move = None
        self.winner = None


    def create_board(self):
        board = [[None for _ in range(8)] for _ in range(8)]

        for y in range(8):
            board[6][y] = Pawn("white")
            board[1][y] = Pawn("black")

        board[7][1] = Knight("white")
        board[7][6] = Knight("white")
        board[0][1] = Knight("black")
        board[0][6] = Knight("black")

        board[7][2] = Bishop("white")
        board[7][5] = Bishop("white")
        board[0][2] = Bishop("black")
        board[0][5] = Bishop("black")

        board[7][0] = Rook("white")
        board[7][7] = Rook("white")
        board[0][0] = Rook("black")
        board[0][7] = Rook("black")

        board[7][3] = Queen("white")
        board[0][3] = Queen("black")

        board[7][4] = King("white")
        board[0][4] = King("black")

        return board

    def move_piece(self, from_pos, to_pos, promotion_choice=None):
        x1, y1 = from_pos
        x2, y2 = to_pos

        if promotion_choice:
            piece = self.board[x2][y2]
            if not isinstance(piece, Pawn) or (x2 != 0 and x2 != 7):
                return {
                    "success": False,
                    "message": "No hay un peón para promover en la posición final.",
                    "board": self.get_board_state()
                }
            if promotion_choice not in ["queen", "rook", "bishop", "knight"]:
                return {
                    "success": False,
                    "message": "Elección de promoción inválida.",
                    "board": self.get_board_state()
                }
            if promotion_choice == "queen":
                self.board[x2][y2] = Queen(piece.color)
            elif promotion_choice == "rook":
                self.board[x2][y2] = Rook(piece.color)
            elif promotion_choice == "bishop":
                self.board[x2][y2] = Bishop(piece.color)
            elif promotion_choice == "knight":
                self.board[x2][y2] = Knight(piece.color)

            self.current_turn = "black" if self.current_turn == "white" else "white"

            return {
                "success": True,
                "message": "Promoción realizada con éxito.",
                "board": self.get_board_state(),
                "turn": self.current_turn,
                "in_check": self.is_in_check(self.current_turn),
                "king_position": self.get_king_position(self.current_turn)
            }

        piece = self.board[x1][y1]
        if not piece:
            return {
                "success": False,
                "message": "No hay ninguna pieza en la posición inicial.",
                "board": self.get_board_state()
            }
        if piece.color != self.current_turn:
            return {
                "success": False,
                "message": f"No es el turno de las piezas {piece.color}.",
                "board": self.get_board_state()
            }

        legal_moves = self.get_legal_moves((x1, y1), self.board, self.last_move)
        if (x2, y2) not in legal_moves:
            return {
                "success": False,
                "message": "Movimiento no permitido.",
                "board": self.get_board_state()
            }

        captured_piece = self.board[x2][y2]
        self.board[x2][y2] = piece
        self.board[x1][y1] = None

        if isinstance(piece, Pawn) and self.last_move:
            last_from, last_to, last_piece = self.last_move
            if abs(x1 - x2) == 1 and y1 != y2 and not captured_piece:
                if isinstance(last_piece, Pawn) and abs(last_from[0] - last_to[0]) == 2 and last_to[1] == y2:
                    captured_piece = self.board[last_to[0]][last_to[1]]
                    self.board[last_to[0]][last_to[1]] = None

        self.last_move = (from_pos, to_pos, piece)

        if isinstance(piece, Pawn) and (x2 == 0 or x2 == 7):
            if promotion_choice is None:
                return {
                    "success": True,
                    "promotion_required": True,
                    "board": self.get_board_state(),
                    "turn": self.current_turn,
                    "in_check": self.is_in_check(self.current_turn),
                    "king_position": self.get_king_position(self.current_turn)
                }

        self.current_turn = "black" if self.current_turn == "white" else "white"

        return {
            "success": True,
            "message": "Movimiento realizado con éxito.",
            "board": self.get_board_state(),
            "turn": self.current_turn,
            "in_check": self.is_in_check(self.current_turn),
            "king_position": self.get_king_position(self.current_turn)
        }

    def get_legal_moves(self, pos, board, last_move):
        x, y = pos
        piece = board[x][y]

        if not piece:
            return []

        possible_moves = piece.get_legal_moves((x, y), board, last_move)

        legal_moves = []
        for move in possible_moves:
            from_pos = (x, y)
            to_pos = move

            captured_piece = board[to_pos[0]][to_pos[1]]
            board[to_pos[0]][to_pos[1]] = piece
            board[x][y] = None

            if not self.is_in_check(piece.color):
                legal_moves.append(to_pos)

            board[x][y] = piece
            board[to_pos[0]][to_pos[1]] = captured_piece

        return legal_moves

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

    def is_in_check(self, color):
        king_pos = self.get_king_position(color)
        if not king_pos:
            return False

        for x in range(8):
            for y in range(8):
                piece = self.board[x][y]
                if piece and piece.color != color:
                    if king_pos in piece.get_legal_moves((x, y), self.board, self.last_move):
                        return True
        return False

    def get_king_position(self, color):
        for x in range(8):
            for y in range(8):
                piece = self.board[x][y]
                if piece and piece.name.lower() == 'k' and piece.color == color:
                    return (x, y)
        return None
    def is_game_over(self):
        """Verifica si el jugador actual tiene algún movimiento legal."""
        for row in range(8):
            for col in range(8):
                piece = self.board[row][col]
                if piece and piece.color == self.current_turn:
                    moves = piece.get_legal_moves((row, col), self.board, self.last_move)
                    if moves:
                        return False
        # Si no hay movimientos legales, es jaque mate o empate (ahogado)
        if self.is_in_check(self.current_turn):
            self.winner = "black" if self.current_turn == "white" else "white"
        else:
            self.winner = None  # Empate por ahogado
        return True

    def get_winner(self):
        return self.winner
    def does_move_cover_check(self, from_pos, to_pos):
        """
        Verifica si un movimiento cubre el jaque o deja al rey en jaque.
        """
        # Obtener la pieza que se está moviendo
        moving_piece = self.board[from_pos[0]][from_pos[1]]
        if not moving_piece:
            print(f"No hay ninguna pieza en la posición {from_pos}.")
            return False

        # Simular el movimiento
        original_piece = self.board[to_pos[0]][to_pos[1]]
        self.board[to_pos[0]][to_pos[1]] = moving_piece
        self.board[from_pos[0]][from_pos[1]] = None

        # Verificar si el rey sigue en jaque después del movimiento
        in_check = self.is_in_check(moving_piece.color)

        # Revertir el movimiento
        self.board[from_pos[0]][from_pos[1]] = moving_piece
        self.board[to_pos[0]][to_pos[1]] = original_piece

        # Si el rey sigue en jaque, el movimiento no cubre el jaque
        if in_check:
            print(f"El movimiento de {from_pos} a {to_pos} no cubre el jaque.")
        else:
            print(f"El movimiento de {from_pos} a {to_pos} cubre el jaque.")
        
        return not in_check