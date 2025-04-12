from app.pieces.piece import Piece

class Rook(Piece):
    def __init__(self, color):
        super().__init__(color)
        self.name = "R"
        self.has_moved = False

    def get_legal_moves(self, pos, board, last_move):
        x, y = pos
        moves = []

        # Direcciones de movimiento válidas para la torre (solo en líneas rectas)
        directions = [(-1, 0),  # Arriba
                      (1, 0),   # Abajo
                      (0, -1),  # Izquierda
                      (0, 1)]   # Derecha

        # Verificar las casillas en las direcciones válidas
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            while self.in_bounds(nx, ny):
                target = board[nx][ny]
                if not target:
                    moves.append((nx, ny))  # Casilla vacía, agregamos el movimiento
                elif target.color != self.color:
                    moves.append((nx, ny))  # Casilla ocupada por una pieza enemiga
                    break  # No podemos mover más allá de una pieza enemiga
                else:
                    break  # Casilla ocupada por una pieza aliada, dejamos de mover

                # Continuar moviendo en esa dirección
                nx += dx
                ny += dy

        return moves

    def in_bounds(self, x, y):
        """Verifica si las coordenadas están dentro del tablero."""
        return 0 <= x < 8 and 0 <= y < 8