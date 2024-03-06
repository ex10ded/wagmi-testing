import { useAccount, useConnect, useDisconnect, useSignTypedData } from 'wagmi'
import { useState } from 'react'
import { keyDerivation, sign, pedersen, ec as starkEc } from '@starkware-industries/starkware-crypto-utils'


const time = new Date()


function App() {


  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { signTypedDataAsync } = useSignTypedData()

  const [text, setText] = useState(`
  {
    "domain":{
       "name":"ex10.exchange"
    },
    "primaryType":"AccountCreation",
    "types":{
       "EIP712Domain":[
          {
             "name":"name",
             "type":"string"
          }
       ],
       "AccountCreation":[
          {
             "name":"accountIndex",
             "type":"int8"
          },
          {
             "name":"wallet",
             "type":"address"
          },
          {
             "name":"tosAccepted",
             "type":"bool"
          },
          {
             "name":"time",
             "type":"string"
          }
       ]
    },
    "message":{
       "accountIndex":0,
       "wallet":"${account?.addresses?.at(0)}",
       "tosAccepted":true,
       "time":"${time.toISOString()}"
    }
 }
  `);
  const [signature, setSignature] = useState("")
  const [starkKey, setStarkKey] = useState("")
  const [pedersenHash, setPedersenHash] = useState("")
  const [starkSignature, setStarkSignature] = useState("")
  const [payload, setPayload] = useState("")


  function handleInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    console.log(JSON.stringify(event.target.value))
    setText(event.target.value)
  }

  async function signData() {
    setSignature("")
    let obj = JSON.parse(text)
    console.log(obj)
    // step 1 obtain signature from wallet over typed data
    let l1Signature = await signTypedDataAsync(obj)
    console.log(l1Signature)
    setSignature(l1Signature)
    // step 2 derive starkKeys from l1 signature
    let starkPrivate = keyDerivation.getPrivateKeyFromEthSignature(l1Signature)
    let starkPublic = keyDerivation.privateToStarkKey(starkPrivate)
    setStarkKey("0x" + starkPublic)

    // step 3 derive pedersen hash (l1Address, l2Address)
    let hash = pedersen([JSON.stringify(account?.addresses?.at(0)).replace("0x", ""), starkPublic])
    setPedersenHash("0x" + hash)

    // step 4 sign pedersen hash with private starkKey
    let l2Signature = sign(starkEc.keyFromPrivate(starkPrivate, 'hex'), hash)
    setStarkSignature(JSON.stringify(l2Signature))

    // step 5 build POST payload for /auth/register
    let payload = {
      l1Signature: l1Signature,
      l2Key: "0x"+ starkPublic,
      l2Signature: {
        r: "0x" + l2Signature.r,
        s: "0x" + l2Signature.s,
      },
      accountCreation: {
        accountIndex: 0,
        wallet: account?.addresses?.at(0),
        tosAccepted: true,
        time: time.toISOString()
      }
    }

    setPayload(JSON.stringify(payload, null, 2))
  }

  return (
    <>
      <div>
        <h2>Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === 'connected' && (
          <button type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>

      <div>
        <h2>Connect</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
        <div>{status}</div>
        <div>{error?.message}</div>
      </div>

      <div>

        <h2>Sign</h2>
        <textarea
          placeholder="Set Message"
          maxLength={2000}
          onChange={handleInput}
          value={text}
          rows={50}
          cols={120}
        />
        <br></br>



        <button
          onClick={async () => await signData()}
        >
          Sign message
        </button>

        <br></br>
        <textarea
          value={signature}
          rows={2}
          cols={140}
        ></textarea>

        <br></br>
        <textarea
          value={starkKey}
          rows={2}
          cols={140}
        ></textarea>

        <br></br>
        <textarea
          value={pedersenHash}
          rows={2}
          cols={140}
        ></textarea>

        <br></br>
        <textarea
          value={starkSignature}
          rows={2}
          cols={140}
        ></textarea>

        <br></br>
        <textarea
          value={payload}
          rows={30}
          cols={160}
        ></textarea>

      </div>
    </>
  )
}

export default App
