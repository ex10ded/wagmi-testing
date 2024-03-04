import { useAccount, useConnect, useDisconnect, useSignTypedData } from 'wagmi'
import { useState } from 'react'

function App() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { signTypedDataAsync } = useSignTypedData()

  const [text, setText] = useState("");
  const [signature, setSignature] = useState("")


  function handleInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    console.log(JSON.stringify(event.target.value))
    setText(event.target.value)
  }

  async function signData() {
    setSignature("")
    let obj = JSON.parse(text)
    console.log(obj)
    let response = await signTypedDataAsync(obj)
    console.log(response)
    setSignature(response)
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
          rows="50"
          cols="120"
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
        rows="2"
        cols="140"
        ></textarea>

      </div>
    </>
  )
}

export default App
