import { useAccount, useConnect, useDisconnect, useSignTypedData } from 'wagmi'
import { useState } from 'react'
import { keyDerivation, sign, pedersen, ec as starkEc } from '@starkware-industries/starkware-crypto-utils'


const time = new Date()


function App() {


  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { signTypedDataAsync } = useSignTypedData()

  const [registerText, setRegisterText] = useState(`
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
 }`);

  const [loginText, setLoginText] = useState(`
 {
   "domain":{
      "name":"ex10.exchange"
   },
   "primaryType":"Login",
   "types":{
      "EIP712Domain":[
         {
            "name":"name",
            "type":"string"
         }
      ],
      "Login":[
         {
            "name":"host",
            "type":"string"
         },
         {
            "name":"action",
            "type":"string"
         },
         {
            "name":"time",
            "type":"string"
         }
      ]
   },
   "message":{
      "host":"${window.location.hostname}",
      "action":"LOGIN",
      "time":"${time.toISOString()}"
   }
}`);

  const [registerSignature, setRegisterSignature] = useState("")
  const [starkKey, setStarkKey] = useState("")
  const [pedersenHash, setPedersenHash] = useState("")
  const [starkSignature, setStarkSignature] = useState("")
  const [registerPayload, setRegisterPayload] = useState("")

  const [loginSignature, setLoginSignature] = useState("")
  const [loginPayload, setLoginPayload] = useState("")

  async function login() {
    setLoginSignature("")
    let obj = JSON.parse(loginText)
    // step 1 obtain signature from wallet over typed data
    let l1Signature = await signTypedDataAsync(obj)

    let payload = {
      l1Signature: l1Signature,
      login: {
        host: window.location.hostname,
        action: "LOGIN",
        time: time.toISOString()
      }
    }

    setLoginSignature(l1Signature)
    setLoginPayload(JSON.stringify(payload, null, 2))
  }

  async function register() {
    setRegisterSignature("")
    let obj = JSON.parse(registerText)
    console.log(obj)
    // step 1 obtain signature from wallet over typed data
    let l1Signature = await signTypedDataAsync(obj)
    console.log(l1Signature)
    setRegisterSignature(l1Signature)
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
      l2Key: "0x" + starkPublic,
      l2Signature: {
        r: "0x" + l2Signature.r.toJSON(),
        s: "0x" + l2Signature.s.toJSON(),
      },
      accountCreation: {
        accountIndex: 0,
        wallet: account?.addresses?.at(0),
        tosAccepted: true,
        time: time.toISOString()
      }
    }

    setRegisterPayload(JSON.stringify(payload, null, 2))
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

        <div className="row" >
          <div className="column">

            <h2>Register</h2>
            <textarea
              placeholder="Set Message"
              maxLength={2000}
              onChange={(event) => setRegisterText(event.target.value)}
              value={registerText}
              rows={50}
              cols={120}
            />
            <br></br>



            <button
              onClick={async () => await register()}
            >
              Register
            </button>

            <br></br>
            <textarea
              value={registerSignature}
              rows={2}
              cols={140}></textarea>

            <br></br>
            <textarea
              value={starkKey}
              rows={2}
              cols={140}></textarea>

            <br></br>
            <textarea
              value={pedersenHash}
              rows={2}
              cols={140}></textarea>

            <br></br>
            <textarea
              value={starkSignature}
              rows={2}
              cols={140}></textarea>

            <br></br>
            <textarea
              value={registerPayload}
              rows={30}
              cols={140}></textarea>

          </div>
          <div className="column">
            <h2>Login</h2>
            <textarea
              placeholder="Set Message"
              maxLength={2000}
              onChange={(event) => setLoginText(event.target.value)}
              value={loginText}
              rows={50}
              cols={120} />

            <br></br>
            <button
              onClick={async () => await login()}
            >
              Login
            </button>
            <br></br>
            <textarea
              value={loginSignature}
              rows={2}
              cols={140}></textarea>

            <textarea
              value={loginPayload}
              rows={30}
              cols={140}></textarea>

            <br></br>
          </div>
        </div>



      </div>
    </>
  )
}

export default App
