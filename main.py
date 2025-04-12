from flask import Flask, jsonify, request, render_template
from board import ChessBoard

app = Flask(__name__, static_url_path="/static", static_folder="static", template_folder="templates")

# Crear el juego
game = ChessBoard()

@app.route('/')
def index():
    return render_template('base.html')  # Tu HTML principal

@app.route('/api/board')
@app.route('/api/board')
def get_board():
    return jsonify({
        "board": game.get_board_state(),
        "turn": game.current_turn  # 👈 ¡Agregá esto!
    })

@app.route('/api/move', methods=['POST'])
def move_piece():
    data = request.get_json()
    from_pos = tuple(data['from'])
    to_pos = tuple(data['to'])

    success = game.move_piece(from_pos, to_pos)
    return jsonify({
        "success": success,
        "board": game.get_board_state(),
        "turn": game.current_turn  # 👈 Asegurate de incluir esto si usás turnos
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

if __name__ == "__main__":
    app.run(debug=True)
