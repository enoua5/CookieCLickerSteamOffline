Game.registerMod("enoua5:offline", {

  // Used because we want all our logic running on the second 'check' event
  checks_ran: 0,

  init: function(){
    let _this = this;
    Game.registerHook("check",function(){
      try
      {
        _this.checks_ran++;
        if(_this.checks_ran != 2) return;
      
        const NOTIF_TIME = 6;
      
        // coords in icon.png
        let clock_icon = [8,0];
        // we'll use question_icon for debug notifs
        let question_icon = [0,7];
        
        
        // what follows is loosly baed on https://github.com/MSco/RealPerfectIdling/blob/master/src/realperfectidling.js
        
        let cookiesEarned = 0;
        let cookiesSucked = 0;
        
        
        let timeOffline=(Date.now()-Game.lastDate)/1000;
        let framesOffline = timeOffline * Game.fps;
        
        let averageCps = _this.calcAverageCps();
        
        let cookiesAndTime = _this.runElderPledge(averageCps, timeOffline);
        cookiesEarned += cookiesAndTime[0];
        let secondsRemaining = cookiesAndTime[1];
        
        let earnedAndSucked = _this.runWrath(averageCps, secondsRemaining);
        cookiesEarned += earnedAndSucked[0];
        cookiesSucked += earnedAndSucked[1];
        
        // Undo the offline earning the game would have normally given so we don't double-count
        _this.undoOfflineEarned();
        
        _this.addTotalCookies(averageCps, timeOffline);
        
        Game.Notify('Welcome back',`You earned <b>${Beautify(cookiesEarned)} cookies</b>, and wrinklers sucked <b>${Beautify(cookiesSucked)} cookies</b> while you were away. (${Game.sayTime(timeOffline, -1)})`,clock_icon, NOTIF_TIME);
      }
      catch(e)
      {
        alert(e.message);
      }
    });
  },
  
  calcAverageCps: function(){
  
    if(Game.Has("Century egg"))
    {
      // TBH, I didn't even know about the century egg, so this is all MSco
      // I haven't tested it, so go tell MSco if it's wrong
    
      let currentEggMult=0;
      if (Game.Has('Chicken egg')) currentEggMult++;
      if (Game.Has('Duck egg')) currentEggMult++;
      if (Game.Has('Turkey egg')) currentEggMult++;
      if (Game.Has('Quail egg')) currentEggMult++;
      if (Game.Has('Robin egg')) currentEggMult++;
      if (Game.Has('Ostrich egg')) currentEggMult++;
      if (Game.Has('Cassowary egg')) currentEggMult++;
      if (Game.Has('Salmon roe')) currentEggMult++;
      if (Game.Has('Frogspawn')) currentEggMult++;
      if (Game.Has('Shark egg')) currentEggMult++;
      if (Game.Has('Turtle egg')) currentEggMult++;
      if (Game.Has('Ant larva')) currentEggMult++;
      let oldEggMult = currentEggMult;
      let averageEggMult = currentEggMult;
      
      //the boost increases a little every day, with diminishing returns up to +10% on the 100th day
      var todayDays=Math.floor((new Date().getTime()-Game.startDate)/1000/10)*10/60/60/24;
      todayDays=Math.min(todayDays,100);
      var currentCenturyBonus = (1-Math.pow(1-todayDays/100,3))*10;
      currentEggMult += currentCenturyBonus;
      
      var lastDateDays=Math.floor((Game.lastDate-Game.startDate)/1000/10)*10/60/60/24;
      lastDateDays=Math.min(lastDateDays,100);
      var oldCenturyBonus = (1-Math.pow(1-lastDateDays/100,3))*10;
      oldEggMult += oldCenturyBonus;
      
      var baseCps = Game.cookiesPs / (1+0.01*currentEggMult);
      var oldCps = baseCps * (1+0.01*oldEggMult);
      
      /*******************/
      // Calculation of century egg bonus averaging over a specific number of intervals
      var numIntervals = 100;
      var intLength = (todayDays-lastDateDays)/numIntervals;
      var averageCenturyBonus = 0;
      for (var i=0; i<=numIntervals;++i)
      {
        var itDays = lastDateDays + i*intLength;
        var itCenturyBonus = (1-Math.pow(1-itDays/100,3))*10;
        averageCenturyBonus += itCenturyBonus;
      }
      averageCenturyBonus /= (numIntervals+1);
      averageEggMult += averageCenturyBonus;
      var averageCps = baseCps * (1+0.01*averageEggMult);
      
      return averageCps;
    }
    else
    {
      return Game.cookiesPs;
    }
    
  },
  
  runElderPledge: function(cps, duration){
    if(Game.pledgeT > 0)
    {
      var secondsRemaining = Math.max(duration - Game.pledgeT/Game.fps, 0);
      var pledgeSeconds = duration - secondsRemaining;
      var pledgeEarned = pledgeSeconds*cps;
      Game.Earn(pledgeEarned);

      Game.pledgeT = Math.max(Game.pledgeT - pledgeSeconds*Game.fps, 0);

      if (Game.pledgeT == 0)
      {
        Game.Lock('Elder Pledge');
        Game.Unlock('Elder Pledge');
        Game.elderWrath = 1;
      }
      
      return [pledgeEarned, secondsRemaining];
    }
    else
      return [0, duration];
  },
  runWrath: function(cps, durationSeconds){
    if(Game.elderWrath > 0)
    {
      // how much frames will be simulated?
      var durationFrames = durationSeconds * Game.fps;

      // initialize values
      var cookiesSuckedWrath=0;
      var cookiesEarnedWrath=0;
      var frames=0;
      var numWrinklers=0;

      // check spawned wrinklers
      for (var i in Game.wrinklers)
      {  
        if(Game.wrinklers[i].phase>0)
        {
          numWrinklers++;
        }
      }

      // spawn remaining wrinklers
      var max = Game.getWrinklersMax();
      while(numWrinklers<max && frames<durationFrames)
      {
        // increase elder wrath
        var potentialWrath = Game.Has('One mind')+Game.Has('Communal brainsweep')+Game.Has('Elder Pact');
        if (Math.random()<0.001 && Game.elderWrath<potentialWrath)
        {
          Game.elderWrath++;
        }
    
        for (var i in Game.wrinklers)
        {
          if (Game.wrinklers[i].phase==0 && Game.elderWrath>0 && numWrinklers<max && Game.wrinklers[i].id<max)
          {
            var chance = 0.00001*Game.elderWrath;
            if (Game.Has('Unholy bait')) chance*=5;
            if (Game.Has('Wrinkler doormat')) chance=0.1;
            if (Math.random()<chance) 
            {
              Game.wrinklers[i].phase=2;
              Game.wrinklers[i].hp=Game.wrinklerHP;
              Game.wrinklers[i].type=0;
              if (Math.random()<0.0001) 
                Game.wrinklers[i].type=1; // shiny wrinkler
              
              numWrinklers++;
            }//respawn
          }
          
          // set cps
          var suckedFactor = numWrinklers*0.05;
          var remainingCps = cps * (1-suckedFactor);
    
          if (Game.wrinklers[i].phase == 2)
          {
            var thisSuck = (cps/Game.fps)*suckedFactor;
            Game.wrinklers[i].sucked += thisSuck;
            cookiesSuckedWrath += thisSuck;
          }
        }
      
        var thisEarned = remainingCps/Game.fps;
        Game.Earn(thisEarned);
        Game.cookiesSucked += ((cps/Game.fps)*suckedFactor);
        cookiesEarnedWrath += thisEarned;
        frames++;
      }

      var spawnTime = frames/Game.fps;

      if (numWrinklers >= Game.getWrinklersMax())
      {
        var fullWitheredTime = durationSeconds-spawnTime;
        var witherFactor = numWrinklers * 0.05;
        var unwitheredCps = cps * (1-witherFactor);
        
        var thisSuck = cps*witherFactor*fullWitheredTime;
        for (var i in Game.wrinklers)
        {
          if (Game.wrinklers[i].phase==2)
          {
            Game.wrinklers[i].sucked+=thisSuck;
            cookiesSuckedWrath += thisSuck;
          }
        }

    
        var thisEarned = unwitheredCps*fullWitheredTime;
        Game.Earn(thisEarned);
        Game.cookiesSucked += thisSuck;
        cookiesEarnedWrath += thisEarned;
      }

      return [cookiesEarnedWrath, cookiesSuckedWrath];
    }
    else
    {
      var thisEarned = cps*durationSeconds;
      Game.Earn(thisEarned);
      
      return [thisEarned, 0];
    }
  },
  undoOfflineEarned: function(){
    // this is just copied from Cookie Clicker's source, just with a negative thrown inPercent
    // this is to prevent double-counting
    if (Game.mobile || Game.Has('Perfect idling') || Game.Has('Twin Gates of Transcendence'))
    {
      if (Game.Has('Perfect idling'))
      {
        var maxTime=60*60*24*1000000000;
        var percent=100;
      }
      else
      {
        var maxTime=60*60;
        if (Game.Has('Belphegor')) maxTime*=2;
        if (Game.Has('Mammon')) maxTime*=2;
        if (Game.Has('Abaddon')) maxTime*=2;
        if (Game.Has('Satan')) maxTime*=2;
        if (Game.Has('Asmodeus')) maxTime*=2;
        if (Game.Has('Beelzebub')) maxTime*=2;
        if (Game.Has('Lucifer')) maxTime*=2;
        
        var percent=5;
        if (Game.Has('Angels')) percent+=10;
        if (Game.Has('Archangels')) percent+=10;
        if (Game.Has('Virtues')) percent+=10;
        if (Game.Has('Dominions')) percent+=10;
        if (Game.Has('Cherubim')) percent+=10;
        if (Game.Has('Seraphim')) percent+=10;
        if (Game.Has('God')) percent+=10;
        
        if (Game.Has('Chimera')) {maxTime+=60*60*24*2;percent+=5;}
      }
      
      var timeOffline=(new Date().getTime()-Game.lastDate)/1000;
      var timeOfflineOptimal=Math.min(timeOffline,maxTime);
      var timeOfflineReduced=Math.max(0,timeOffline-timeOfflineOptimal);
      var amount=(timeOfflineOptimal+timeOfflineReduced*0.1)*Game.cookiesPs*(percent/100);
      
      if (amount>0)
      {
        if (Game.prefs.popups) Game.Popup('Eliminated '+Beautify(amount)+' cookie'+(Math.floor(amount)==1?'':'s') + ', in ' + Game.sayTime(timeOfflineOptimal*Game.fps));
        else Game.Notify('Welcome back!','Eliminated <b>'+Beautify(amount)+'</b> cookie'+(Math.floor(amount)==1?'':'s') + ', in ' + Game.sayTime(timeOfflineOptimal*Game.fps));
        Game.Earn(-amount);
      }
    }
  },
  
  addTotalCookies: function(cps, durationSeconds){
    var factor = cps / Game.cookiesPs;
    for (var i in Game.Objects)
    {
      var me=Game.Objects[i];
      me.totalCookies+=(me.storedTotalCps*factor*Game.globalCpsMult) * durationSeconds;
    }
  },
  
  save: function(){
    //use this to store persistent data associated with your mod
  },
  load: function(str){
    //do stuff with the string data you saved previously
  },
});
