from flask import Flask, jsonify, request, render_template
from board import ChessBoard

app = Flask(__name__, static_url_path="/static", static_folder="static", template_folder="templates")

# Crear el juego
game = ChessBoard()

@app.route('/')
def index():
    return render_template('base.html')  # Tu HTML principal

@app.route('/api/board')
def get_board():
    king_in_check = None
    if game.is_in_check(game.current_turn):
        king_in_check = game.get_king_position(game.current_turn)

    return jsonify({
        "board": game.get_board_state(),
        "turn": game.current_turn,
        "king_in_check": king_in_check  # Posición del rey en jaque (o None si no está en jaque)
    })

@app.route("/legal_moves", methods=["POST"])
def legal_moves():
    data = request.get_json()
    row, col = data["row"], data["col"]

    piece = game.board[row][col]
    if piece is None:
        return jsonify({"moves": []})

    moves = piece.get_legal_moves((row, col), game.board, game.last_move)
    return jsonify({"moves": moves})

@app.route("/api/move", methods=["POST"])
def move_piece():
    data = request.get_json()
    from_pos = tuple(data['from'])
    to_pos = tuple(data['to'])
    promotion_choice = data.get('promotion_choice')  # Obtener la elección de promoción (si existe)

    # Llamar a la función move_piece y obtener la respuesta
    result = game.move_piece(from_pos, to_pos, promotion_choice)

    # Verificar si el rey sigue en jaque después del movimiento
    if game.is_in_check(game.current_turn):
        result["in_check"] = True  # Indicar que el rey sigue en jaque
        result["king_position"] = game.get_king_position(game.current_turn)
    else:
        result["in_check"] = False

    # Verificar si el movimiento no cubre el jaque
    result["move_does_not_cover_check"] = result["in_check"]

    # Asegurarse de incluir el campo "promotion_required" si está presente
    if "promotion_required" not in result:
        result["promotion_required"] = False

    # Retornar la respuesta completa de move_piece
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)