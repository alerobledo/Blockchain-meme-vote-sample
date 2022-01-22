const CONTRACT_SOURCE = `@compiler >= 4

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

const contractAddress = 'ct_iEMxnmk2mxbkzC3oJaGD22U5XnWWRhVVJ4qS4v5cgTyVKKgjv';

const SECRET_KEY = '984ed0b5bdfa38492befd858f6b2bdd813fcec2e9135c8fd76f72b156b42a36031c2d93d375bfb518b93dd2db51f2877576b66077e3fea930434258e31d8a531';
const PUBLIC_KEY = 'ak_Nv5iC9hU8NQPrihqDYu57g5zAhboLCPZ1GB5VRYvrRfAkyPyf';

var client = null;
var contractInstance;

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
//Make a call to get data of smart contract func, with specefied arguments
const calledGet = await contractInstance.call(func, args, {callStatic: true}).catch(e => console.error(e));
//Make another call to decode the data received in first call
const decodedGet = await calledGet.decodedResult;

return decodedGet;
}

//Create a asynchronous write call for our smart contract
async function contractCall(func, args, value) {
    //Make a call to write smart contract func, with aeon value input
    const calledSet = await contractInstance.call(func, args, {amount: value}).catch(e => console.error(e));
  
    return calledSet;
}

window.addEventListener('load', async () => {
    $("#loader").show();

    node = await Ae.Node({ url: 'https://testnet.aeternity.io' });
    const account = Ae.MemoryAccount({
        // provide a valid keypair with your secretKey and publicKey
        keypair: { secretKey: SECRET_KEY, publicKey: PUBLIC_KEY }
        })

        //create client
        client = await Ae.Universal({
        nodes: [
            { name: 'testnet', instance: node }
        ],
        compilerUrl: 'https://compiler.aepps.com', // ideally host your own compiler
        accounts: [account]
        })

        //create contract instance
        contractInstance = await client.getContractInstance({ source: CONTRACT_SOURCE, contractAddress: contractAddress })
        console.log("contract:" + contractInstance)

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
        votes: parseInt(meme.voteCount,10),
        })
    }
   
    renderMemes();
  
    $("#loader").hide();
  });
  
//If someone clicks to vote on a meme, get the input and execute the voteCall
jQuery("#memeBody").on("click", ".voteBtn", async function(event){
    $("#loader").show();
    //Create two new let block scoped variables, value for the vote input and
    //index to get the index of the meme on which the user wants to vote
    let value = $(this).siblings('input').val(),
    index = event.target.id;
  
    //Promise to execute execute call for the vote meme function with let values
    await contractCall('voteMeme', [index], value);
  
    //Hide the loading animation after async calls return a value
    const foundIndex = memeArray.findIndex(meme => meme.index == event.target.id);
    //console.log(foundIndex);
    memeArray[foundIndex].votes += Number(value);
  
    renderMemes();
    $("#loader").hide();
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