  const Discord = require("discord.js")
  const color = require("chalk")
  const bot = new Discord.Client();
  const Database = require("./database.js")
  const Settings = require("./settings.js")

  var database

  bot.on('ready', () => {
  	database = new Database("127.0.0.1", 3306,  "root", "", "betsystem") 
      setTimeout(start, 2500) 
  })

  function start(){
     console.log(color.yellow("BetSystem v1.0 ") + color.green("Made by boi1216 "))

     database.getAllTickets().then(tickets => {
         tickets.forEach(ticket => {
         	 var channel = bot.channels.cache.get(ticket['channel_id'])
         	 channel.messages.fetch().then(messages => {
     		 messages.array().reverse().forEach(msg => {
     			 for(let embed of msg.embeds){
     			 	if(embed.description.includes("support will be with you shortly!")){
     			 		const filter = (reaction, user) => {
  	                    return ['✅'].includes(reaction.emoji.name) && !user.bot;
                      }
            
  	                var collector = msg.createReactionCollector(filter, { });
  	                collector.on('collect', (reaction, user) => {
  	                msg.reactions.resolve("✅", reaction).users.remove(user.id)

  	               if(reaction.emoji.name === "✅"){
  	               var user = channel.name.split("-")
  	               database.deleteTicket(findUser(user[1]).id)
  	    	           channel.delete()
  	               }

  	              })
     			 	}
     			 }
     		  })
       	})

         })
     })
     var point_channel_id = Settings.POINTS_CHANNEL_ID
     var point_channel = bot.channels.cache.get(point_channel_id)

     if(point_channel !== null){
     	point_channel.messages.fetch().then(messages => {
     		messages.array().reverse().forEach(msg => {
     			msg.delete()
     		})

     	})


     	var embed = new Discord.MessageEmbed()
     	.setTitle("Points Shop")
     	.setDescription("React with 🎟️ to open a ticket")
     	.addField("Current rate", "100 points = 10 USD")
     	.addField("Payment methods", "Bitcoin (BTC) and Ether (ETH)")

     	point_channel.send(embed).then(msg => {
     		msg.react("🎟️")

     		const filter = (reaction, user) => {
  	          return ['🎟️'].includes(reaction.emoji.name) && !user.bot;
          }

  	    var collector = msg.createReactionCollector(filter, { });
  	    collector.on('collect', (reaction, user) => {
  	    msg.reactions.resolve("🎟️", reaction).users.remove(user.id)

  	    if(reaction.emoji.name === "🎟️"){
  	    	openTicket(user, point_channel.guild)
  	    }
  	    })

     	})

     }


     var tipsterChannel = bot.channels.cache.get(Settings.TIPSTER_CHANNEL_ID)
     if(tipsterChannel != null){
     	   tipsterChannel.messages.fetch().then(messages => {
            		messages.array().reverse().forEach(msg => {
                      for(let embed of msg.embeds){
                      	if(embed.description.includes("Click to open")){
                          var username = embed.description.split(" ")[3].split("'")[0]
            				var userT = findUser(username)
            				if(userT === null){
            					return
            				}

  	                    database.getTipsterData(userT).then(tipster => {
                             const filter = (reaction, user) => {
  	                       return ['✅'].includes(reaction.emoji.name) && !user.bot;
                           }

  	                	var collector = msg.createReactionCollector(filter, { });
  	                	collector.on('collect', (reaction, user) => {
  	                	msg.reactions.resolve("✅", reaction).users.remove(user.id)
  	                    if(reaction.emoji.name === "✅"){
  	                         sendConfirmation(user, username, tipster[0]['price'], tipster[0]['days'], tipster[0]['speciality'], tipsterChannel.guild)	
  	                    }
  	                    })
            				//continue
            			    })
                      	}
                      }
            			if(msg.content.includes(" VIP:") && msg.content.includes(`Speciality:`)){
            				
                      }
              })
       })
     }
  }

  async function openTicket(user, guild) {
  	var hasTicket = await database.hasTicketOpened(user.id)
  	console.log(hasTicket)
  	if(hasTicket == true){
  		user.send(":warning: You already have opened a ticket")
  		return
  	}



  	guild.channels.create("ticket-" + user.username, { reason: 'User opened a ticket' }).then(channel => {
  		database.openTicket(user.id, channel.id)
           channel.updateOverwrite(user, { VIEW_CHANNEL: true, SEND_MESSAGES: true });

           var embed = new Discord.MessageEmbed()
           .setDescription("Dear " + user.username + ", support will be with you shortly!")
           .setFooter("React with ✅ to close the ticket")
           channel.send(embed).then(msg => {
           	msg.react("✅")

           	const filter = (reaction, user) => {
  	          return ['✅'].includes(reaction.emoji.name) && !user.bot;
              }

  	        var collector = msg.createReactionCollector(filter, { });
  	        collector.on('collect', (reaction, user) => {
  	        msg.reactions.resolve("✅", reaction).users.remove(user.id)

  	        if(reaction.emoji.name === "✅"){
  	        var user = channel.name.split("-")
  	        database.deleteTicket(findUser(user[1]).id)
  	    	   channel.delete()
  	        }

  	        })
           })
  	})




  }

  function isAdminChannel(channel) {
  	return channel.id === Settings.ADMIN_CHANNEL_ID
  }

  function isPointCheckChannel(channel) {
  	return channel.id === Settings.POINT_CHECK_CHANNEL_ID
  }


  async function getClient(id){
  	var client = await database.getClientData(id)
  	if(client[0] == null){
  		await database.registerClient(id)
  		client = await database.getClientData(id)
  		return client
  	}
  	return client
  }

  async function sendTransactionHistory(user, to){
      var client = await getClient(to.id)
      var transactionHistory = JSON.parse(client[0]['purchase_history'])
      console.log(transactionHistory)
      var transactions = new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle(to.username + "'s transactions (" + Object.keys(transactionHistory).length + " total)")
      for(var date in transactionHistory){
         transactions.addField("[" + new Date(date).toString() + "]", "Tipster: " + transactionHistory[date]['tipster'] + "\n" + "Price: " + transactionHistory[date]['amount'] + "\nDays: " + transactionHistory[date]['days'])
   

      }
      user.send(transactions)

      database.getTipsterData(to.id).then(data => {
      	if(data == null){
              return
      	}

      	var transactionHistory = JSON.parse(data[0]['purchase_history'])
          var transactions = new Discord.MessageEmbed()
          .setColor("#0099ff")
          .setTitle(to.username + "'s sales (" + Object.keys(transactionHistory).length + " total)")
          var dateNow = new Date()
          var dateLast = new Date()
          dateLast.setMonth(dateLast.getMonth() - 1)
          var earned = 0
          var earnedLast = 0
          for(var date in transactionHistory){
              var tDate = new Date(date)
              transactions.addField("[" + tDate.toString() + "]", "Buyer: " + transactionHistory[date]['customer'] + "\n" + "Price: " + transactionHistory[date]['amount'] + "\nDays: " + transactionHistory[date]['days'])
              
              if(tDate.getYear() === dateNow.getYear() && tDate.getMonth() === dateNow.getMonth()){
                     earned += (+transactionHistory[date]['amount'])
              }

              if(tDate.getYear() === dateNow.getYear() && tDate.getMonth() === dateLast.getMonth()){
              	earnedLast += (+transactionHistory[date]['amount'])
              }

          }
         
      user.send(transactions)
      user.send("This month earnings: **" + earned / 10 + "$** (" + earned + " points worth)")
      user.send("Previous month earnings: **" + earnedLast / 10 + "$** (" + earnedLast + " points worth)")
      })
  }


  async function sendPoints(user, channel, forOthers){
  	var client = await getClient(user.id)
  	var points = client[0]['points']

      if(forOthers == null){
       channel.send("Points balance for " + user.username + ": " + points)
       var activeSubs = JSON.parse(client[0]['active_subs'])
       var msg = ''
       var sentSub = 0
       
       for(var key in activeSubs){
       	if(sentSub === 0){
              channel.send("**Active subscriptions:**")
       	}
       	sentSub++
       	console.log(key)
       	if(activeSubs.hasOwnProperty(key)){
       		var expDate = new Date(activeSubs[key]['expiration'])
       		var dateNow = new Date()
       		var timeDiff = Math.abs(expDate.getTime() - dateNow.getTime()); 
  	    	var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
       		var tipster = findUser(key)

       	
       		if(tipster != null){
       			channel.send(tipster.username + " VIP: " + diffDays + " days remaining" )
       		}
       	}
       }
         return
      }
      var other = await getClient(forOthers.id)
      var oPoints = other[0]['points']

      channel.send("Points balance for " + forOthers.username + ": " + oPoints)
      var activeSubs = JSON.parse(other[0]['active_subs'])
       var msg = ''
       var sentSub = 0
       for(var key in activeSubs){
       	if(sentSub === 0){
             channel.send("**Active subscriptions:**")
       	}
       	sentSub++
       	console.log(key)
       	if(activeSubs.hasOwnProperty(key)){
       		var expDate = new Date(activeSubs[key]['expiration'])
       		var dateNow = new Date()
       		var timeDiff = Math.abs(expDate.getTime() - dateNow.getTime()); 
  	    	var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
       		var tipster = findUser(key)

       	
       		if(tipster != null){
       			channel.send(tipster.username + " VIP: " + diffDays + " days remaining" )
       		}
       	}
       }
  }

  async function addPoints(id, amount){
     var client = await getClient(id)
     var points = parseInt(client[0]['points']) + parseInt(amount)
     database.updateClientData(id, 'points', points)
  }

  async function removePoints(id, amount){
     var client = await getClient(id)
     var points = parseInt(client[0]['points']) - parseInt(amount)
     database.updateClientData(id, 'points', points)
  }

  async function addVIPDays(user, days, tipster, channel) {
  	var client = await getClient(user.id)
  	var activeSubs = JSON.parse(client[0]['active_subs'])

  	var tipsterUser = findUser(tipster)
  	if(!activeSubs.hasOwnProperty(tipster.id)){
          channel.send(user.username + " is not subscribed for " + tipster.username + "'s tips")
          return
  	}

  	var expDate = new Date(activeSubs[tipster.id]['expiration'])
  	expDate.setDate(expDate.getDate() + (+days))
  	activeSubs[tipster.id] = {expiration: expDate.toJSON()}
  	database.updateClientData(user.id, 'active_subs', JSON.stringify(activeSubs))
  	channel.send(":white_check_mark: Added " + days + " days to " + user.username + "'s subscription for " + tipster.username)
  }

  async function delVIPDays(user, days, tipster, channel) {
  	var client = await getClient(user.id)
  	var activeSubs = JSON.parse(client[0]['active_subs'])

  	var tipsterUser = findUser(tipster)
  	if(!activeSubs.hasOwnProperty(tipster.id)){
          channel.send(user.username + " is not subscribed for " + tipster.username + "'s tips")
          return
  	}

  	var expDate = new Date(activeSubs[tipster.id]['expiration'])
  	expDate.setDate(expDate.getDate() - (+days))
  	activeSubs[tipster.id] = {expiration: expDate.toJSON()}
  	database.updateClientData(user.id, 'active_subs', JSON.stringify(activeSubs))


  	channel.send(":white_check_mark: Removed " + days + " from " + user.username + "'s subscription to " + tipster.username)
  }

  function findUser(identifier) {
  	var byUsername = bot.users.cache.find(u => u.username.toLowerCase() == identifier.toLowerCase());
  	var byTag = bot.users.cache.find(u => u.tag === identifier);
  	//var byMention = getUserFromMention(identifier);
  	var byID = bot.users.cache.find(u => u.id === identifier)

  	if(byUsername != null){
  		return byUsername
  	}

  	if(byID){
  		return byID
  	}

  	if(byTag != null){
  		return byTag
  	}

  	/*if(byMention != null){
  		return byMention
  	}*/
  	return null
  }

  async function isTipster(id) {


  }

  async function buyPackage(buyer, tipster, price, days){
      
  }

  async function sendConfirmation(user, username, price, days, speciality, guild) {

      getClient(user.id).then(client => {
      	client = client[0]
      	if(client['points'] < price * 10){
      	   user.send(":warning: You don't have enough points to buy this package!")
             return
      	}

          var confirmationEmbed = new Discord.MessageEmbed()
  	    .setColor('#0099ff')
  	    .setTitle('PURCHASE CONFIRMATION')
  	    .setDescription("Please confirm the purchase of " + username + "'s VIP package")
  	    .addFields(
  	    { name: 'Current points', value: client['points'], inline: true },
  	    { name: 'Points after purchase', value: (+client['points'] - (+price * 10)) + "\u200B", inline: true },
  		{ name: 'Price', value: price + '$ (' + price * 10 + ' points)', inline: true },
  		{ name: 'Lasts for', value: days + ' day(s)', inline: true },
  		{ name: 'Speciality', value: speciality, inline: true },
  	    )
  	    var activeSubsJSON = client['active_subs']
  	    var activeSubs = JSON.parse(activeSubsJSON)
  	    if(activeSubs.hasOwnProperty(findUser(username).id)){
  	    	var dateNow = new Date()
  	    	var expDate = new Date(activeSubs[user.id]['expiration'])
  	    	var timeDiff = Math.abs(expDate.getTime() - dateNow.getTime()); 
  	    	var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  	    	if(diffDays <= 0){
  	    		delete activeSubs[findUser(username).id]
  	    		database.updateClientData(user.id, 'active_subs', JSON.stringify(activeSubs))
  	    		confirmationEmbed.addField('Active Subscription', 'No', true)

  	    		var member = tipsterChannel.guild.members.cache.get(user.id)
  	            var role = guild.roles.cache.find(r => r.name === username + "-VIP")
  	            member.roles.remove(role)
  	    	}else{
                  confirmationEmbed.addField('Active Subscription', "Yes (Expires in " + diffDays + " days" + ")", true)
  	    	}
  	    
  	    }else{
              confirmationEmbed.addField('Active Subscription', 'No', true)
  	    }
  	    user.send(confirmationEmbed).then(msg => {
  	    	msg.react("✅")
  	    	msg.react("❎")


  	    	const filter = (reaction, user) => {
  	                 return ['✅', '❎'].includes(reaction.emoji.name) && !user.bot;
                  };

  	        var collector = msg.createReactionCollector(filter, { });
  	                collector.on('collect', (reaction, user) => {
  	              	msg.reactions.resolve("✅", reaction).users.remove(user.id)
  	                   if(reaction.emoji.name === "✅"){
  	                     	reaction.message.delete()
  	                     	var tipster = findUser(username)
  	                     	if(activeSubs.hasOwnProperty(tipster.id)){
  	                     		var exp = new Date(activeSubs[tipster.id]['expiration']);
  	                     		exp.setDate(exp.getDate() + (+days))
  	                     		activeSubs[tipster.id] = {expiration: exp.toJSON()}
  	                     		database.updateClientData(user.id, 'active_subs', JSON.stringify(activeSubs))
  	                     	}else{
  	                            var exp = new Date(); 
                                  exp.setDate(exp.getDate() + (+days));
                               //   console.log("NEW " + exp.toJSON())

                                  activeSubs[tipster.id] = {expiration: exp.toJSON()}
                                  database.updateClientData(user.id, 'active_subs', JSON.stringify(activeSubs))



  	                     	} 
  	         
  	                        user.send(":white_check_mark: Purchase succesfull!")
  	                        var member = guild.members.cache.get(user.id)
  	                        console.log("Username " + username  + "-VIP")
  	                        var role = guild.roles.cache.find(r => r.name === username + "-VIP")
  	                        member.roles.add(role)

  	                        database.updateClientData(user.id, 'points', (+client['points'] - (+price * 10)))

                              var date = new Date() 
  	                        var transactionHistory = JSON.parse(client['purchase_history'])
  	                        transactionHistory[date.toJSON()] = {days: days, amount: price * 10, tipster: username}
  	                        database.updateClientData(user.id, 'purchase_history', JSON.stringify(transactionHistory))
  	                        database.getTipsterData(findUser(username).id).then(data => {
  	                        	console.log(data[0])
  	                        	var transactionHis = JSON.parse(data[0]['purchase_history'])

  	                        	transactionHis[date.toJSON()] = {days: days, amount: price * 10, customer: user.username}
  	                        	database.updateTipster(findUser(username).id, 'purchase_history', JSON.stringify(transactionHis))
  	                        })
  	                   }else{
  	                     	reaction.message.delete()
  	                     	user.send(":white_check_mark: Purchase cancelled")
  	                   }
  	             });
  	    })
      })
  }



  function getUserFromMention(mention) {
  	if (!mention) return;

  	if (mention.startsWith('<@') && mention.endsWith('>')) {
  		mention = mention.slice(2, -1);

  		if (mention.startsWith('!')) {
  			mention = mention.slice(1);
  		}

  		return bot.users.cache.get(mention);
  	}
  }

  bot.on('message', message => {
    if(message.content.startsWith(Settings.COMMAND_PREFIX)){
    	const args = message.content.slice(Settings.COMMAND_PREFIX.length).trim().split(' ');
    	const command = args.shift().toLowerCase();
      const prefix = Settings.COMMAND_PREFIX
      if(command === "help"){
       
      	message.channel.send({embed: {
          color: 11416728,
          author: {
              name: 'BetSystem User Commands',
          },
          description: '',
          footer: {
              icon_url: bot.user.avatarURL,
              text: 'Your footer'
          },
          fields: [
              {
                  name: prefix + 'help',
                  value: 'Description: List of commands',
              },
              {
                  name: prefix + 'points',
                  value: 'Description: Displaying available points',
              },
              {
                  name: prefix + 'transactions',
                  value: 'Description: Displaying your transaction history',
              }
            ]
          }})
          
            if(message.member.hasPermission("ADMINISTRATOR")){
      	message.author.send({embed: {
          color: 11416728,
          author: {
          	icon_url: bot.user.avatarURL,
              name: 'BetSystem Admin Commands'
          },
          description: '',
          footer: {
              text: 'Your footer'
          },
          fields: [
              {
                  name: prefix + 'addtipster <user> <price> <days> <speciality>',
                  value: 'Description: Adding new Tipster',
              },
              {
                  name: prefix + 'deltipster <user>',
                  value: 'Description: Manually removing Tipster',
              },
              {
                  name: prefix + 'settipprice <user> <price>',
                  value: 'Description: Setting price of Tipsters service',
              },
              {
                  name: prefix + 'addpoints <user> <points>',
                  value: 'Description: Adding points to a user',
              },
              {
                  name: prefix + 'delpoints <user> <points>',
                  value: 'Description: Removing points from a user',
              },
              {
                  name: prefix + 'points <user>',
                  value: 'Description: Displaying available points for certain user',
              },
              {
                  name: prefix + 'transactions <user>',
                  value: 'Description: Showing transaction history for a user/tipster',
              },
              {
                  name: prefix + 'addvipdays <user>',
                  value: 'Description: Add days to VIP subscription',
              },
              {
                  name: prefix + 'addtipdays <user>',
                  value: 'Description: Add days to tipster subscription',
              },
              {
                  name: prefix + 'delvip <user> <tipster>',
                  value: 'Description: Removing users VIP for certain tipster',
              },
              {
                  name: prefix + 'removetipdays <user>',
                  value: 'Description: Showing transaction history for a user/tipster',
              }
            ]
         }})

      	message.author.send({embed: {
          color: 11416728,
          author: {
              name: 'BetSystem SETUP Commands',
          },
          description: '',
          footer: {
              icon_url: bot.user.avatarURL,
              text: 'Your footer'
          },
          fields: [
              {
                  name: prefix + 'setvipcategory',
                  value: 'Description: Set category to place VIP channels',
              },
              {
                  name: prefix + 'setpointchannel',
                  value: 'Description: Set channel for buying points',
              },
              {
                  name: prefix + 'setbuychannel',
                  value: 'Description: Set channel for buying VIP access',
              },
              {
                  name: prefix + 'settipsterchannel',
                  value: 'Description: Set channel displaying available tipsters',
              }
            ]
          }})
      }
      }else if(command === "setprefix"){
      	message.delete({timeout: 10000})
      	if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}

      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}
          if(args[0] == null){
          	message.channel.send("**" + Settings.COMMAND_PREFIX + "setprefix <Prefix>**").then(msg => {
          		msg.delete({timeout: 5000})
          	})
          	message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help").then(msg => {
          		msg.delete({timeout: 5000})
          	})
          	return
          }

          database.updateSettings('prefix', args[0])
          message.channel.send("Prefix was set to: " + args[0]).then(msg => {
          	msg.delete({timeout: 5000})
          })
          Settings.COMMAND_PREFIX = args[0]
      }else if(command === "addtipster"){
          if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}

      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}

      	if(Settings.VIP_CATEGORY === 0){
      		message.channel.send("You need to set VIP CATEGORY setting in order to use this command!")
      		return
      	}

      	if(Settings.TIPSTER_CHANNEL_ID == null || Settings.TIPSTER_CHANNEL_ID === 0){
      		message.channel.send("You need to set TIPSTER CHANNEL setting in order to use this command!")
      		return
      	}

      	var tipsterChannel = message.guild.channels.cache.get(Settings.TIPSTER_CHANNEL_ID)
      	if(tipsterChannel == null){
      		message.channel.send("You need to set valid TIPSTER CHANNEL in order to use this command!")
      		return
      	}

      	if(args[0] == null || args[1] == null || args[2] == null || args[3] == null || args[4] == null){
      		message.channel.send("**" + Settings.COMMAND_PREFIX + "addtipster <User> <Price> <Days> <Speciality> <Spreadsheet>**")
          	message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
          	return
      	}

      	var user = findUser(args[0])
      	if(user == null){
      		message.channel.send("User not found")
          	return
      	}

      	database.getTipsterData(user.id).then(tipsterProfile => {
      	if(tipsterProfile.length > 0){
      		message.channel.send(":warning: " + user.username + " is already a tipster")
      		return
      	}else{
              if(isNaN(args[1]) && isNaN(parseFloat(args[1]))){
      		message.channel.send("Please enter a valid price").then(msg => {
          		msg.delete({timeout: 5000})
          	})
          	return
          	}

           	if(isNaN(args[2]) && isNaN(parseFloat(args[2]))){
      		message.channel.send("Please enter a valid number of days").then(msg => {
          		msg.delete({timeout: 5000})
          	})
          	return
      	    }

      	    var channel = message.guild.channels.create(user.username + "-vip", { reason: 'New VIP registration' }).then(channel => {

      		channel.setParent(Settings.VIP_CATEGORY)
      		database.registerTipster(user.id, channel.id, +args[1], +args[2], args[3], args[4], 0)
      		message.guild.roles.create({
          	data: {
                    name: user.username + "-BOSS",
                    color: 'BLUE',
              },
              reason: 'Creating role for Tipsters'}).then(role => {
                 channel.updateOverwrite(role, { VIEW_CHANNEL: true, SEND_MESSAGES: true});
                 var member = message.guild.members.cache.get(user.id)
                 member.roles.add(role)
              })
              message.guild.roles.create({
          	data: {
                    name: user.username + "-VIP",
                    color: 'YELLOW',
              },
              reason: 'Creating role for Tipsters customers'}).then(role => {
              channel.updateOverwrite(role, { SEND_MESSAGES: false, VIEW_CHANNEL: true });
                  
              })

              channel.updateOverwrite(channel.guild.roles.everyone, { VIEW_CHANNEL: false, SEND_MESSAGES: false });
              
      		message.channel.send(":white_check_mark: Tipster added")
      		message.channel.send("**Username:** " + user.username)
      		message.channel.send("**Price:** " + args[1] + "$ / " + args[2] + " days")

              var needToSendBody = true
              var needToSendURL = true
      		var body = `:gem: <@${user.id}>\n` + user.username + " VIP: " + args[1] + "$ for " + args[2] + " days\nSpeciality: " + args[3] + "\n\n**React with ✅ to buy**"
                    var spreadsheet = new Discord.MessageEmbed()
  	               .setColor('#0099ff')
  	               .setTitle('Spreadsheet HERE')
  	               .setDescription("Click to open " + user.username + "'s spreadsheet")
  	               .setURL(args[4])
  	       tipsterChannel.send(body).then(dataMessage => {
                  tipsterChannel.send(spreadsheet).then(msg => {
  	          	msg.react("✅")
  	          	const filter = (reaction, user) => {
  	                 return ['✅'].includes(reaction.emoji.name) && !user.bot;
                  };

  	          	var collector = msg.createReactionCollector(filter, { });
  	                	collector.on('collect', (reaction, userZ) => {
  	                	msg.reactions.resolve("✅", reaction).users.remove(user.id)
  	                    if(reaction.emoji.name === "✅"){
  	                         sendConfirmation(userZ, user.username, args[1], args[2], args[3], message.guild)	
  	                    }
  	             });
  	       })
  	       })
             
        })
        }
    })
      }else if(command === "deltipster"){
      	if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}

      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}

      	if(args[0] == null){
              message.channel.send("**" + Settings.COMMAND_PREFIX + "deltipster <User>**")
              message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
      		return
      	}
          var user = findUser(args[0])
          if(user == null){
               message.channel.send(":warning: User not found")
               return
          }

          database.getTipsterData(user.id).then(tipsterData => {
      	   if(tipsterData === null || tipsterData.length < 1){
      	   	message.channel.send(":warning: User is not a tipster")
      		return
      	    }
      	  console.log(tipsterData)

      	  var channel = message.guild.channels.cache.get(tipsterData[0]['channel_id'])
            if(channel != null){
          	 channel.delete()
            }
            var channelOther = message.guild.channels.cache.find(c => c.name === user.username + "-vip")
            if(channelOther != null){
            	channelOther.delete()
            }
            var member = message.guild.members.cache.get(user.id)
            var role = member.roles.cache.find(r => r.name === user.username + "-BOSS")
            if(role){
          	role.delete()
            }
          
            var roleVIP = member.roles.cache.find(r => r.name === user.username + "-VIP")
            if(roleVIP){
              roleVIP.delete()
            }

            var tipsterChannel = message.guild.channels.cache.get(Settings.TIPSTER_CHANNEL_ID)
          
            database.deleteTipster(user.id)
            message.channel.send(":white_check_mark: Tipster deleted")
            var tipsterChannel = bot.channels.cache.get(Settings.TIPSTER_CHANNEL_ID)

            if(tipsterChannel != null){
     	           tipsterChannel.messages.fetch().then(messages => {
            		messages.array().reverse().forEach(msg => {
                      for(let embed of msg.embeds){
                      	if(embed.description.includes("Click to open " +  user.username + "'s spreadsheet")){
                                  msg.delete()
                      	}
                      }
                      if( msg.content.includes(user.username + " VIP") && msg.content.includes(`<@${user.id}>`)){
                      		msg.delete()
                     	}
                  })
            	})
     	      }
        })
    
            
      }else if(command === "updatetipster"){
      	if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}

      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}

      	if(args[0] == null || args[1] == null || args[2] == null || args[3] == null || args[4] == null){
              message.channel.send("**" + Settings.COMMAND_PREFIX + "updatetipster <User> <Price> <Days> <Speciality> <Spreadsheet>**")
              message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
      		return
      	}

      	var user = findUser(args[0])
      	if(user == null){
      		message.channel.send(":warning: User not found")
               return
      	}

      	database.getTipsterData(user.id).then(tipsterData => {
      		tipsterData = tipsterData[0]
      	   if(tipsterData == null){
      	   	message.channel.send(":warning: User is not a tipster")
      		return
      	  }

      	  console.log(tipsterData)

      	  var channel = message.guild.channels.cache.get(Settings.TIPSTER_CHANNEL_ID)
            if(channel == null){
            	message.channel.send("You need to set Tipster List in order to use this command!")
          	return
            }

            if(isNaN(args[1])){
            	message.channel.send(":warning: Please enter valid price")
            	return
            }

            if(isNaN(args[2])){
            	message.channel.send(":warning: Please enter valid number of days")
            }

            if(args[3].length < 2){
            	message.channel.send(":warning: Please enter valid speciality [Min. Length: 2]")
            	return
            }

            if(args[3].length > 15){
            	message.channel.send(":warning: Please enter valid speciality [Max. Length: 15]")
            	return
            }

            if(!args[4].startsWith("https://") && !args[4].startsWith("http://")){
            	message.channel.send(":warning: Spreadsheet needs to be a valid HTTP/HTTPS link")
            	return
            }
            database.updateTipster(user.id, 'price', args[1])
            database.updateTipster(user.id, 'days', args[2])
            database.updateTipster(user.id, 'speciality', args[3])
            database.updateTipster(user.id, 'spreadsheet_link', args[4])

            message.channel.send("**Username:** " + user.username)
            message.channel.send("**Price:** " + args[1] + "$ for " + args[2] + " days")
            message.channel.send("**Speciality:** " + args[3])
            message.channel.send("**Spreadsheet:** " + args[4])

            var channel = message.guild.channels.cache.get(Settings.TIPSTER_CHANNEL_ID)
            if(channel != null){
            	channel.messages.fetch().then(messages => {
            		console.log(messages)
                 messages.array().reverse().forEach(msg => {
                 	    console.log(msg.content)
                 	   if(msg.content.includes(`<@${user.id}>`) && msg.content.includes(user.username + " VIP:")){
                 	   	    msg.edit(`:gem: <@${user.id}>\n` + user.username + " VIP: " + args[1] + "$ for " + args[2] + " days\nSpeciality: " + args[3] + "\n\n**React with ✅ to buy**")
                 	   }

                 	   for(let embed of msg.embeds){
                 	   	   if(embed.title === "Spreadsheet HERE" && embed.description === "Click to open " + user.username + "'s spreadsheet"){
                 	   	   	var spreadsheet = new Discord.MessageEmbed()
  	               .setColor('#0099ff')
  	               .setTitle('Spreadsheet HERE')
  	               .setDescription("Click to open " + user.username + "'s spreadsheet")
  	               .setURL(args[4])
                 	   	   	   msg.edit(spreadsheet)
                 	   	   }
                 	   }
                 })
            	})
            }else{
            	console.log("Channel is null " + tipsterData['channel_id'])
            }
      	})
            	message.channel.send(":white_check_mark: Tipster updated")
      }else if(command === "addpoints"){
      	if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}

      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}

          if(args[0] == null || args[1] == null){
          	message.channel.send("**" + Settings.COMMAND_PREFIX + "addpoints <User> <Amount>**").then(msg => {
          		msg.delete({timeout: 5000})
          	})
          	message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help").then(msg => {
          		msg.delete({timeout: 5000})
          	})
          	return
          }

          var user = findUser(args[0])
          if(user !== null){
              addPoints(user.id, args[1])
              message.channel.send(":white_check_mark: Added " + args[1] + " points to " + user.username)
          }else{
          	message.channel.send("User not found")
          }
       }else if(command === "delpoints"){
      	if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}

      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}

          if(args[0] == null || args[1] == null){
          	message.channel.send("**" + Settings.COMMAND_PREFIX + "delpoints <User> <Amount>**")
          	message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help").then(msg => {
          		msg.delete({timeout: 5000})
          	})
          	return
          }

          var user = findUser(args[0])
          if(user !== null){
              removePoints(user.id, args[1])
              message.channel.send(":white_check_mark: Deleted " + args[1] + " points from " + user.username)
          }else{
          	message.channel.send("User not found")
          }
          
      }else if(command === "points"){
      	if(!isPointCheckChannel(message.channel) && !isAdminChannel(message.channel)){
      		return
      	}
      	if(args[0] == null){
               sendPoints(message.author, message.channel, null)
      	}else{
      		var otherU = findUser(args[0])
      		if(otherU != null){
      			console.log("Sent points for: " + otherU.username)
      			sendPoints(message.author, message.channel, otherU)
      		}
      	}
      }else if(command === "addvipdays"){
          if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}

      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}

      	if(args[0] == null || args[1] == null || args[2] == null){
          	message.channel.send("**" + Settings.COMMAND_PREFIX + "addtipdays <User> <Days> <Tipster>**")
          	message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
          	return
          }

          var user = findUser(args[0])
          if(user == null){
              message.channel.send("User not found")
          	return
          }

          var tipster = findUser(args[2])
          if(tipster == null){
          	message.channel.send("Tipster not found")
          	return
          }

          if(isNaN(args[1])){
          	message.channel.send("Please enter a valid number of days")
          	return
          }

          addVIPDays(user, +args[1], tipster, message.channel)
      }else if(command === "delvipdays"){
          if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}
      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}
      	if(args[0] == null || args[1] == null || args[2] == null){
          	message.channel.send("**" + Settings.COMMAND_PREFIX + "delvipdays <User> <Days> <Tipster>**")
          	message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
          	return
          }

          var user = findUser(args[0])
          if(user == null){
              message.channel.send("User not found")
          	return
          }

          var tipster = findUser(args[2])
          if(tipster == null){
          	message.channel.send("Tipster not found")
          	return
          }

          if(isNaN(args[1])){
          	message.channel.send("Please enter a valid number of days")
          	return
          }

          delVIPDays(user, +args[1], tipster, message.channel)
      }else if(command === "transactions"){
      	 if(args[0] == null){
               sendTransactionHistory(message.author, message.author)
               return
      	 }

      	 var user = findUser(args[0])
      	 if(user == null){
      	 	message.channel.send("User not found")
      	 	return
      	 }

      	 sendTransactionHistory(message.author, user)
          
      }else if(command === "setpointchannel"){
          if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}

      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}
      	if(args[0] == null){
      		message.channel.send("**" + Settings.COMMAND_PREFIX + "setpointchannel <channel>");
      		message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
      		return
      	}

      	var channel = message.guild.channels.cache.get(args[0].substring(2).substring(0,18))
      	if(channel == null){
      		message.channel.send("Invalid channel")
      		return
      	}

      	database.updateSettings('points_channel', channel.id)
      	message.channel.send(":white_check_mark: **Settings updated succesfully**")

      }else if(command === "setvipcategory"){
          if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}
      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}
      	if(args[0] == null){
      		message.channel.send("**" + Settings.COMMAND_PREFIX + "setvipcategory <category id>")
      		message.reply("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
      		return
      	}

      	var category = message.guild.channels.cache.find(cat => cat.id === args[0])
      	if(category == null){
      		message.channel.send("Invalid category")
      		return
      	}

      	database.updateSettings('vip_category', category.id)
      	message.channel.send(":white_check_mark: **Settings updated succesfully**")
      }else if(command === "settipsterlist"){
          if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}
      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}
      	if(args[0] == null){
      		message.channel.send("**" + Settings.COMMAND_PREFIX + "settipsterlist <channel>");
      		message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
      		return
      	}

      	var channel = message.guild.channels.cache.get(args[0].substring(2).substring(0,18))
      	if(channel == null){
      		message.channel.send("Invalid channel").then(msg => {
          		msg.delete({timeout: 5000})
          	})
      		return
      	}

      	database.updateSettings('tipster_channel', channel.id)
      	message.channel.send(":white_check_mark: **Settings updated succesfully**")
      	Settings.TIPSTER_CHANNEL_ID = channel.id
      }else if(command === "setadminchannel"){
          if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}

      	if(args[0] == null){
      		message.channel.send("**" + Settings.COMMAND_PREFIX + "setadminchannel <channel>");
      		message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
      		return
      	}

      	var channel = message.guild.channels.cache.get(args[0].substring(2).substring(0,18))
      	if(channel == null){
      		message.channel.send("Invalid channel")
      		return
      	}

      	database.updateSettings('admin_channel', channel.id)
      	message.channel.send(":white_check_mark: **Settings updated succesfully**")

      	Settings.ADMIN_CHANNEL_ID = channel.id
      }else if(command === "setpointcheckchannel"){
          if(!message.member.hasPermission("ADMINISTRATOR")){
      		return
      	}
      	if(!isAdminChannel(message.channel)){
      		message.delete()
      		return
      	}
      	if(args[0] == null){
      		message.channel.send("**" + Settings.COMMAND_PREFIX + "setpointcheckchannel <channel>");
      		message.channel.send("For list of all available commands type " + Settings.COMMAND_PREFIX + "help")
      		return
      	}

      	var channel = message.guild.channels.cache.get(args[0].substring(2).substring(0,18))
      	if(channel == null){
      		message.channel.send("Invalid channel")
      		return
      	}

      	database.updateSettings('point_check_channel', channel.id)
      	message.channel.send(":white_check_mark: **Settings updated succesfully**")
      	Settings.POINT_CHECK_CHANNEL_ID = channel.id
      }
  }
  })

  bot.login("NzcwMzQ4NDU5MzEwOTczMDE5.X5cQ6Q.ywnLeMcoFw-fTr7lFbJX-d2AZ_c")