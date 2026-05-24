import { useUpload } from '../hooks/useUpload'
import DefinitionBlock from '../components/home/DefinitionBlock'
import UploadCard from '../components/home/UploadCard'
import ProtocolSteps from '../components/home/ProtocolSteps'
import CapabilitiesSection from '../components/home/CapabilitiesSection'
import SecurityCard from '../components/home/SecurityCard'

export default function Home() {
  const { status, file, shareUrl, error, handleFileSelect, handleUpload, reset } = useUpload()

  return (
    <main>
      <DefinitionBlock />
      <hr />
      <UploadCard
        status={status}
        file={file}
        shareUrl={shareUrl}
        error={error}
        onFileSelect={handleFileSelect}
        onUpload={handleUpload}
        onReset={reset}
      />
      <ProtocolSteps />
      <CapabilitiesSection />
      <SecurityCard />
    </main>
  )
}
