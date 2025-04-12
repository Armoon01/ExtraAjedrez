class Piece:
    def __init__(self, color):
        self.color = color  # "white" o "black"
        self.name = "?"

    def get_legal_moves(self, position, board):
        raise NotImplementedError("Este método debe ser implementado por las subclases.")