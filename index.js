const contractSource = `@compiler >= 4

payable contract AleVote =
  
  record meme = 
    { creatorAddress : address,
      url            : string,
      name           : string,
      voteCount      : int }
    
  record state = 
    { memes : map(int, meme),
      memesLength : int}
    
  entrypoint init() = 
    { memes = {},
      memesLength = 0 }
  
  entrypoint getMeme(index : int) : meme =
    switch(Map.lookup(index, state.memes))
      None => abort("No meme found")
      Some(x) => x      
    
  stateful entrypoint registerMeme(url' : string, name' : string) =
    let meme = { creatorAddress = Call.caller, url = url', name = name', voteCount = 0 }
    let index = getMemesLength() + 1
    put(state { memes[index] = meme, memesLength = index })
    
  entrypoint getMemesLength() : int =
    state.memesLength
    
  payable stateful entrypoint voteMeme(index : int) =
    let meme = getMeme(index)
    Chain.spend(meme.creatorAddress, Call.value)
    let updatedVoteCount = meme.voteCount + Call.value
    let updatedMemes = state.memes{ [index].voteCount = updatedVoteCount}
    put(state { memes = updatedMemes })`;

const contractAddress = 'ct_ez2eMyJFU68rQn9W54ewQhyApWRDQarFLhozWU3h38TRF7jeJ';

var client = null;
var memeArray = [];
var memesLength = 0;

function renderMemes() {
    memeArray = memeArray.sort(function(a,b){return b.votes-a.votes})
    var template = $('#template').html();
    Mustache.parse(template);
    var rendered = Mustache.render(template, {memeArray});
    $('#memeBody').html(rendered);
  }
  
  //Create a asynchronous read call for our smart contract
    async function callStatic(func, args) {
    //Create a new contract instance that we can interact with
    const contract = await client.getContractInstance(contractSource, {contractAddress});
    //Make a call to get data of smart contract func, with specefied arguments
    const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
    //Make another call to decode the data received in first call
    const decodedGet = await calledGet.decode().catch(e => console.error(e));
  
    return decodedGet;
  }

  window.addEventListener('load', async () => {
    $('#loader').show();

    client = await Ae.Aepp();
      //First make a call to get to know how may memes have been created and need to be displayed
  
     //Assign the value of meme length to the global variable
    memesLength = await callStatic('getMemesLength', []);

    //Loop over every meme to get all their relevant information
    for (let i = 1; i <= memesLength; i++) {

        //Make the call to the blockchain to get all relevant information on the meme
        const meme = await callStatic('getMeme', [i]);

        //Create meme object with  info from the call and push into the array with all memes
        memeArray.push({
        creatorName: meme.name,
        memeUrl: meme.url,
        index: i,
        votes: meme.voteCount,
        })
    }
    
    renderMemes();
  
    $("#loader").hide();

  });
  
  jQuery("#memeBody").on("click", ".voteBtn", async function(event){
    const value = $(this).siblings('input').val();
    const dataIndex = event.target.id;
    const foundIndex = memeArray.findIndex(meme => meme.index == dataIndex);
    memeArray[foundIndex].votes += parseInt(value, 10);
    renderMemes();
  });
  
  $('#registerBtn').click(async function(){
    var name = ($('#regName').val()),
        url = ($('#regUrl').val());
  
    memeArray.push({
      creatorName: name,
      memeUrl: url,
      index: memeArray.length+1,
      votes: 0
    })
    renderMemes();
  });