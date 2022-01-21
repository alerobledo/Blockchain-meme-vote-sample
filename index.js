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
    $("#loader").show();

    node = await Ae.Node({ url: 'https://testnet.aeternity.io' });
    const account = Ae.MemoryAccount({
        // provide a valid keypair with your secretKey and publicKey
        keypair: { secretKey: SECRET_KEY, publicKey: PUBLIC_KEY }
      })

      const client = await Ae.Universal({
        nodes: [
          { name: 'testnet', instance: node }
        ],
        compilerUrl: 'https://compiler.aepps.com', // ideally host your own compiler
        accounts: [account]
      })
    
    height = await client.height();
    console.log("Current Block Height sync:" + height)                                

    const contractInstance = await client.getContractInstance({ source: CONTRACT_SOURCE, contractAddress: contractAddress })
    console.log("contract:" + contractInstance)

    const memesLegnth = await contractInstance.call('getMemesLength', [], {callStatic: true}).catch(e => console.error(e));
    //const memesLegnth = await contractInstance.methods.getMemesLength();
    console.log('memesLegnth', memesLegnth.decodedResult);
    

  /*
    client = await Ae.Aepp();
  
    const contract = await client.getContractInstance(contractSource, {contractAddress});
    const calledGet = await contract.call('getMemesLength', [], {callStatic: true}).catch(e => console.error(e));
    console.log('calledGet', calledGet);
  
    const decodedGet = await calledGet.decode().catch(e => console.error(e));
    console.log('decodedGet', decodedGet);
  */
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