const mysql = require('mysql2/promise');
const color = require("chalk")
const util = require('util');
const settingZ = require('./settings.js')
class Database{

	constructor(hostname, port, user, pass, database){
		this.hostname = hostname
		this.port = port
		this.user = user
		this.pass = pass
		this.database = database
    this.connection = null

    this.connect()
	}


	connect(){
        var self = this;
      
        self.connection = mysql.createPool({
          	host     : this.hostname,
            database : "betsystem",
            user     : this.user,
            password : this.pass,
        })

        console.log(color.green('[MySQL] Pool initialized'))
        this.prepareTables()
	}

  async loadSettings(){
    var self=  this
    var settings = await this.getSettings()

    if(settings[0] == null){
      self.connection.query("INSERT INTO settings (points_channel, buy_channel, vip_category, tipster_channel, prefix, admin_channel, point_check_channel) VALUES (0, 0, 0, 0, '!', 0, 0)")
      console.log(color.green("[MySQL] Default settings written"))
    }else{
      settingZ.POINTS_CHANNEL_ID = settings[0]['points_channel']
      settingZ.BUY_CHANNEL_ID = settings[0]['buy_channel']
      settingZ.VIP_CATEGORY = settings[0]['vip_category']
      settingZ.COMMAND_PREFIX = settings[0]['prefix']
      settingZ.TIPSTER_CHANNEL_ID = settings[0]['tipster_channel']
      settingZ.ADMIN_CHANNEL_ID = settings[0]['admin_channel']
      settingZ.POINT_CHECK_CHANNEL_ID = settings[0]['point_check_channel']

      console.log(color.green("[MySQL] Settings loaded [CHANNEL1: " + settingZ.POINTS_CHANNEL_ID + " CHANNEL2: " + settingZ.BUY_CHANNEL_ID + " CATEGORY_ID(VIP): " + settingZ.VIP_CATEGORY + "]"))
    }
  }

  async prepareTables(){
    var self = this

    var taskDone = false
    try{
    let tipsterTable  = `create table if not exists tipsters(
                          discord_id VARCHAR(30),
                          channel_id VARCHAR(20),
                          price int,
                          earnings_now int,
                          earnings_last int,
                          purchase_history text,
                          active_until VARCHAR(20),
                          spreadsheet_link VARCHAR(70),
                          speciality VARCHAR(15),
                          days VARCHAR(3)
                     )`;
   await self.connection.query(tipsterTable)
   
   let clientsTable  = `create table if not exists clients(
                          discord_id VARCHAR(30),
                          points VARCHAR(10),
                          active_subs text,
                          purchase_history text
                     )`;
   await self.connection.query(clientsTable)

   let settingsTable  = `create table if not exists settings(
                          points_channel VARCHAR(20),
                          buy_channel VARCHAR(20),
                          vip_category text,
                          tipster_channel VARCHAR(20),
                          prefix VARCHAR(3),
                          admin_channel VARCHAR(20),
                          point_check_channel VARCHAR(20)
                     )`;
   await self.connection.query(settingsTable)

   let ticketsTable = `create table if not exists tickets(
                        channel_id VARCHAR(20),
                        creator_id VARCHAR(30))`
   await self.connection.query(ticketsTable)

   }catch(err){
      console.log(color.red("[MySQL] Failed to prepare tables"))
      return
   }
   
   console.log(color.green("[MySQL] Tables initialized"))
   this.loadSettings()
  }

  async updateSettings(field, value) {
    var self = this
    try{
      var SQL = "UPDATE settings SET " + field + "='" + value + "'"
      await self.connection.query(SQL)
    }catch(err){
      console.log(color.red("[MySQL] Failed to update settings [Field: " + field + " | Value: " + value + "]"))
       return false
    }
    return true
  }

  async getSettings() {
     var self = this
     try{
      var SQL = "SELECT * FROM settings"
      const rows = await self.connection.query(SQL)
      return rows[0]
     }catch(err){
      console.log(color.red("[MySQL] Failed to load settings."))
     }
    
  }

  async registerClient(id) {
    var self = this
    try{
      var SQL = "INSERT INTO clients (discord_id, points, active_subs, purchase_history) VALUES (" + id + ", '0', '{}', '{}')"
      const rows = await self.connection.query(SQL)
      return rows[0]
    }catch(err){
      console.log(color.red("[MySQL] Failed to register client ID: " + id))
      console.log(err)
    }
  }

  async getClientData(id) {
    var self = this
    try{
      var SQL = "SELECT * FROM clients WHERE discord_id='" + id + "'"
      const rows = await self.connection.query(SQL)
      return rows[0]
    }catch(err){
      console.log(color.red("[MySQL] Failed to load client data for Client ID: " + id))
    }
  }

  async updateClientData(id, field, value) {
    var self = this
    try{
      var SQL = "UPDATE clients SET " + field + "= '" + value + "' WHERE discord_id='" + id + "'"
      await self.connection.query(SQL)
    }catch(err){
      console.log(color.red("[MySQL] Failed to update client data for Client ID: " + id))
    }
  }

  async getTipsterData(id) {
    var self = this
    try{
      var SQL = "SELECT * FROM tipsters WHERE discord_id='" + id + "'"
      const rows = await self.connection.query(SQL)
     // console.log(rows[0])
      return rows[0]
    }catch(err){
      console.log(color.red("[MySQL] Failed to load client data for Client ID: " + id))
    }
    return null
  }

  async registerTipster(id, channel, price, days,  speciality, spreadsheet,  exp) {
    console.log("SPREADSHEET: " + spreadsheet)
    console.log("SPECIALITY: " + speciality)
    var self = this
    try{
      var SQL = "INSERT INTO tipsters (discord_id, channel_id, price, earnings_now, earnings_last, purchase_history, active_until, spreadsheet_link, speciality, days) VALUES (" + id + ",'"  + channel + "', '" + price + "', '0', '0', '{}', '" + exp + "', '" + spreadsheet + "', '" + speciality + "', '" + days + "')"
      const rows = await self.connection.query(SQL)
      return rows[0]
    }catch(err){
      console.log(color.red("[MySQL] Failed to register tipster ID: " + id))
      console.log(err)
    }
  }

  async updateTipster(id, field, value) {
    var self = this
    try{
      var SQL = "UPDATE tipsters SET " + field + "= '" + value + "' WHERE discord_id='" + id + "'"
      await self.connection.query(SQL)
    }catch(err){
      console.log(color.red("[MySQL] Failed to update client data for Tipster ID: " + id))
      console.log(err)
    }
  }

  async deleteTipster(id) {
    var self = this
    try{
      var SQL = "DELETE FROM tipsters WHERE discord_id='" + id + "'"
      await self.connection.query(SQL)
    }catch(err){
      console.log(color.red("[MySQL] Failed to delete tipster ID: " + id))
      console.log(err)
    }
  }

  async hasTicketOpened(id){
    var self = this
    try{
      var SQL = "SELECT * FROM tickets WHERE creator_id='" + id + "'"
      var result = await self.connection.query(SQL)
      console.log(result[0][0]['channel_id'])

      return result[0][0].hasOwnProperty('channel_id')
    }catch(err){
      console.log(color.red("[MySQL] Failed to check if ticket opened for ID: " + id))
      console.log(err)
    }
  }

  async openTicket(id, channel) {
    var self = this
    try{
      var SQL = "INSERT INTO tickets (channel_id, creator_id) VALUES ('" + channel  + "', '" + id + "')" 
      await self.connection.query(SQL)
    }catch(err){
      console.log(color.red("[MySQL] Failed to open a ticket for ID: " + id))
      console.log(err)
    }
  }

  async deleteTicket(id){
    var self = this
    try{
      var SQL = "DELETE FROM tickets WHERE creator_id='" + id + "'" 
      await self.connection.query(SQL)
    }catch(err){
      console.log(color.red("[MySQL] Failed to open a ticket for ID: " + id))
      console.log(err)
    }
  }

  async getAllTickets(){
   var self = this
    try{
      var SQL = "SELECT * FROM tickets"
      var s = await self.connection.query(SQL)
      return s[0]
    }catch(err){
      console.log(color.red("[MySQL] Failed to fetch all tickets: " + id))
      console.log(err)
    }
  }



	abort(){

	}


}
module.exports = Database