import sys
import os
import shutil

if len(sys.argv) < 4:
	print('Usage: extractor.py <MACONDO LOG FILE> <WORD LIST> <START IDX>')
	sys.exit(1)

alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
# board size
N = 15

word_list = set(line.strip().upper() for line in open(sys.argv[2], encoding='utf-8'))

# can change these to implement non-ASCII tiles
def encode(tile: str) -> int:
	return ord(tile)
def decode(tile: int) -> str:
	if tile == 0: return '.'
	return chr(tile)


class GameState:
	def __init__(self) -> None:
		self.board = bytearray(N * N)
	def make_play(self, play: str) -> None:
		if play.startswith('(exch') or play == '(Pass)':
			return
		coord = play[:3].strip()
		tiles = play[4:]
		horizontal = coord[0].isdigit()
		if horizontal:
			row = int(coord[:-1]) - 1
			col = ord(coord[-1]) - ord('A')
		else:
			row = int(coord[1:]) - 1
			col = ord(coord[0]) - ord('A')
		for c in tiles:
			assert row >= 0 and col >= 0 and row < N and col < N
			if c != '.':
				self.board[row * N + col] = encode(c)
			if horizontal:
				col += 1
			else:
				row += 1
	
	def board_string(self) -> str:
		rows = []
		for row in range(15):
			rows.append(''.join(decode(tile) for tile in self.board[row*N:(row+1)*N]) + '\n')
		return ''.join(rows)

	def try_place(self, row: int, col: int, letter: str) -> list[str]:
		board = self.board[:]
		if board[row*N+col]:
			# there's already a tile here
			return []
		board[row*N+col] = encode(letter)
		neighbours = []
		if row > 0:
			neighbours.append(board[(row-1)*N+col])
		if row < N-1:
			neighbours.append(board[(row+1)*N+col])
		if col > 0:
			neighbours.append(board[row*N+col-1])
		if col < N-1:
			neighbours.append(board[row*N+col+1])
		if all(n == 0 for n in neighbours):
			# doesn't connect to any existing plays
			return []
		i = col
		while i > 0 and board[row*N+i-1]:
			i -= 1
		horizontal_word = ''
		while i < 15 and board[row*N+i]:
			horizontal_word += decode(board[row*N+i])
			i += 1
		words = []
		if len(horizontal_word) > 1:
			words.append(horizontal_word)
		i = row
		while i > 0 and board[(i-1)*N+col]:
			i -= 1
		vertical_word = ''
		while i < 15 and board[i*N+col]:
			vertical_word += decode(board[i*N+col])
			i += 1
		if len(vertical_word) > 1:
			words.append(vertical_word)
		if not all(word in word_list for word in words):
			return []
		return words

	def blank_plays(self) -> list[tuple[int, str, list[str]]]:
		plays = []
		for row in range(N):
			for col in range(N):
				for letter in alphabet:
					words_formed = self.try_place(row, col, letter)
					if words_formed:
						plays.append((row*15+col, letter, words_formed))
		return plays

	def output(self, filename: str) -> None:
		if os.path.exists(filename):
			print(filename, 'already exists')
			sys.exit(1)
		with open('challenge.tmp', 'wb') as out:
			out.write(self.board_string().encode())
			for square, letter, _ in self.blank_plays():
				out.write(f'{square} {letter}\n'.encode())
		os.rename('challenge.tmp', filename)
games_file = open(sys.argv[1], encoding='utf-8')
try:
	os.mkdir('challenges')
except FileExistsError:
	pass
lines = iter(games_file)
next(lines) # skip header
games = {}
count = 0
game_idx = int(sys.argv[3])
for line in lines:
	line = line.strip()
	fields = line.split(',')
	game_id = fields[1]
	if game_id not in games:
		games[game_id] = GameState()
	play = fields[4]
	games[game_id].make_play(play)
	if fields[3] == '?':
		game = games[game_id]
		plays = game.blank_plays()
		nice_plays = [play for play in plays if any(len(w) > 4 for w in play[2])]
		# require at least 3 plays that make 5+-letter words
		if len(nice_plays) >= 3:
			game.output(f'challenges/{game_idx:05}.txt')
			print(game.board_string())
			print(len(plays), 'plays')
			count += 1
			game_idx += 1
print(count, 'challenges made.')
