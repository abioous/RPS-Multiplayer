
var gameItems = ['Rock', 'Paper', 'Scissors'];

var game = {
	//last snapshot values of what is stored in firebase
	players:{},
	winner: '',
	update:function(players) {
		this.players = players;
		this.render();
		
	},

	
	getWinner:function(player1Choice, player2Choice) {
			if(player1Choice && player2Choice) {//both choices present
				if((player1Choice == 'Rock' && player2Choice == 'Scissors') ||
					(player1Choice == 'Scissors' && player2Choice == 'Paper') || 
				    (player1Choice == 'Paper' && player2Choice == 'Rock')
					) {
					return this.players.player1.name;
				} else if((player2Choice == 'Rock' && player1Choice == 'Scissors') ||
					(player2Choice == 'Scissors' && player1Choice == 'Paper') ||
					(player2Choice == 'Paper' && player1Choice == 'Rock')) {
					return  this.players.player2.name;
				} else {
					return 'Tie'
				}
			}
			return '';
	},

	takeSeat:function(playerSeat,playerName) {
		this.playerSeat = playerSeat;
		this.playerName = playerName;

		//write to database with new player
		firebase.database().ref(playerSeat).set({
				name:playerName,
				winCount:0,
				losesCount:0,
				choice:'',
				chat:[],
		});
		this.render();
	},

	start:function() {
		var playerName = $('#name').val();
		 $('#name').val('');
		//if name empty do nothing, return immeditely 
		if(playerName == '' || playerName.trim() == '') {
			return;
		}
		
		if(! this.hasPlayer1()){
			this.takeSeat('player1', playerName);
		} else if( ! this.hasPlayer2()){
			this.takeSeat('player2', playerName);
		}

	},

	otherPlayerSeat:function() {
			if(this.playerSeat == 'player1') {
				return 'player2';
			} else {
				return 'player1';
			}
	},



	sendMessage:function(message) {
			var playerName = this.players[this.playerSeat].name;
			var partner = this.otherPlayerSeat();
			firebase.database().ref(partner).transaction(function(record) {
				if(record) {
					if(! record.chat) {
						record.chat = []
					}
					record.chat.unshift(playerName + ': ' + message)
				}
				return record;
			});

			if(this.playerSeat) {
				firebase.database().ref(this.playerSeat).transaction(function(record) {
					if(record) {
						if(! record.chat) {
							record.chat = []
						}
						record.chat.unshift(playerName + ': ' + message)
					}
					return record;
				});
			}
	},
	stop:function() {
		var partner = this.otherPlayerSeat();
		firebase.database().ref(partner).transaction(function(record) {
					if(record) {
						if(! record.chat) {
							record.chat = []
						}
						record.chat.unshift(game.playerName + ' has left')
					}
					return record;
		});
		firebase.database().ref(this.playerSeat).remove();
	},

	isThisGamePlayer: function(player) {
		console.log(player.name + ' ' + this.playerName)
		if(player.name == this.playerName) {
			return true;
		}
		return false;

	},
	hasPlayer1:function() {
		if('player1' in this.players){
			return true;
		}
		return false;
	},
	hasPlayer2:function(){
		if('player2' in this.players){
			return true;
		}
		return false;
	},

	setChoice:function(choice) {
		var playerSeat = this.playerSeat;
		var partner = this.otherPlayerSeat();
		var choices = {};
		var players = {};


		firebase.database().ref().transaction(function(record) {
			console.log('trans: ' + record);
			console.log(record);


			if(record[playerSeat]) {
				console.log('updating choice ' + playerSeat + ' ' + choice)
				record[playerSeat].choice = choice
			}

			if(record.player1) {
				players.player1 = record.player1;
			}
			if(record.player2) {
				players.player2 = record.player2;
			}
			return record;
			
		});
		

		this.update(players);
		if(this.hasPlayer1() && this.hasPlayer2()) {
			
			var winner = this.getWinner(players.player1.choice, players.player2.choice);
			console.log('winner: ' + winner)
			if(winner) {
				this.updateWinner(winner);
				
			}

		}

	},

	updateWinner:function(winner) {
		var winners = [];
		var looser;
		if(winner == 'Tie') {
			winners.push('player1', 'player2');

		} else if(winner == this.players.player1.name) {
			winners.push('player1');
			looser = 'player2';
		} else  {
			winners.push('player2');
			looser = 'player1';
		}
		for(var i = 0;i<winners.length;i++) {
			this.players[winners[i]].winCount++;
				firebase.database().ref(winners[i]).transaction(function(record) {
					record.winCount++;
					return record;
				})
		}
		if(looser) {
				this.players[looser].losesCount++;
				firebase.database().ref(looser).transaction(function(record) {
					record.losesCount++;
					return record;
				})	
		}
		this.winner = winner;
		this.render();

		window.setTimeout(function(){ game.nextRound(); }, 3000);

	},


	renderPlayer:function(playerWindow, hasPlayer, player, playerSeat) {
		playerWindow.empty();
		if(! hasPlayer) {
			playerWindow.text("Waiting for " + playerSeat);
		} else {
			var nameDiv = $('<h3>');
			nameDiv.text(player.name);
			playerWindow.append(nameDiv);
			if(player.choice) {
				var choice = $('<h1>');
				if(this.isThisGamePlayer(player) || this.winner) {
					choice.text(player.choice);
				} else {
					choice.text('?')
				}
				playerWindow.append(choice);
			} else {
				var options = $('<ul>');
				options.addClass('list-unstyled')
				options.addClass('list-group');
				options.addClass('lightyellowbackground');
				options.addClass('round-border');

				for(var i = 0; i<gameItems.length;i++){
					var listItem = $('<li>');
					listItem.addClass('list-group-item');
					listItem.addClass('lightyellowbackground');
					listItem.text(gameItems[i]);

					if(this.isThisGamePlayer(player)) {
						listItem.addClass('slection');
						listItem.attr('data-choice', gameItems[i]);
						listItem.click(function() {
							var choice = $(this).attr('data-choice');
							game.setChoice(choice)
						})
					}


					options.append(listItem);
					
				}
				playerWindow.append(options);
			} 
			var score = $('<div>');
			score.text('Wins: ' + player.winCount + 
					' Losses: ' + player.losesCount);
			playerWindow.append(score);	
		}


	},
	nextRound:function() {
		this.winner  = '';
		var players = {}
		for(var playerSeat in this.players) {
			console.log('reseting choice ' +playerSeat)
			firebase.database().ref(playerSeat).transaction(function(record) {

					record.choice = '';
					players[playerSeat] = record;				
					console.log('updated next round ' + playerSeat);
					console.log(record);
					return record;
			});	
		}

		this.update(players);
		this.render();
	},

	setWinnerIfNeeded: function() {
		if(this.hasPlayer1() && this.hasPlayer2()) {
			if(this.players.player1.choice == '' && this.players.player2.choice == '') {
				this.winner  = '';
			} else if(this.players.player1.choice && this.players.player2.choice) {
				this.winner  = this.getWinner(this.players.player1.choice, this.players.player2.choice)
			}
		}
	},

	render:function(){
		this.setWinnerIfNeeded();
		var name = this.playerName;
		if(name) {
			$('.welcome').text('Hi ' + name);
			$('.welcome').css('display', 'inline'); // show it
			$('.startGame').css('display', 'none'); //hide it
			$('.chat').css('display', 'flex'); 

		} else if(! this.hasPlayer1() || ! this.hasPlayer2() ) { // check is there is at least one seat available
			$('.welcome').css('display', 'none'); // hide it
			$('.startGame').css('display', 'inline'); //show it
			$('.chat').css('display', 'none'); 
		} else {
			$('.welcome').css('display', 'none'); 
			$('.startGame').css('display', 'none'); 
			$('.chat').css('display', 'none'); 
		}

		$('#winnerWindow').empty();
		if(this.winner) {
			var winner = $('<h1>');
			winner.text(this.winner);
			$('#winnerWindow').append(winner);
		} 
		var player1Window = $('#player1Window');
		this.renderPlayer(player1Window, this.hasPlayer1(), this.players.player1, 'player 1');

		var player2Window = $('#player2Window');
		this.renderPlayer(player2Window, this.hasPlayer2(), this.players.player2, 'player 2');
		if(this.playerSeat) {
			var thisPlayer = this.players[this.playerSeat];
			if(thisPlayer && thisPlayer.chat && thisPlayer.chat.length > 0) {
				var formatedChat = thisPlayer.chat.join('<br>');
				$('#chat').html(formatedChat);
			}
		}
	}
}

$(document).ready(function() {

	var playerToRemove = '';


	firebase.database().ref().on('value',function(snapshot){
		
		console.log('reading listener ')
		var players = {};
		var value = snapshot.val();
		if(value == null) {
			game.update(players);
			return;
		}

		//read form local cache
		if('player1' in value)  {//test if value has 'player1' key
			players.player1 = {};
			for(var key in value.player1) {
				players.player1[key] = value.player1[key];
			}
			if(value.player1.chat &&  value.player1.chat.length > 0 && value.player1.chat[0] == value.player1 + ' has left') {
				playerToRemove = 'player1';
			}
		}
		if('player2' in value){
			players.player2 = {};
			for(var key in value.player2){
				players.player2[key] = value.player2[key];
			}
			if(value.player2.chat &&  value.player2.chat.length > 0 && value.player2.chat[0] == value.player1 + ' has left') {
				playerToRemove = 'player2';
			}
		}

		game.update(players);


	});
	if(playerToRemove) {
		firebase.database().ref(playerToRemove).remove();
	}

	var startButton = $('#startButton');
	startButton.click(function(){
		 	game.start();
	})

	var sendButton = $('#sendButton');
	sendButton.click(function() {
		var message = $('#message').val();
		$('#message').val('');
		if(message) {
			game.sendMessage(message);
		}
	})

});


$(window).on('beforeunload', function(){
  console.log("beforeUnload event!");
	game.stop();
	alert(1);
})


