import { useUpload } from '../hooks/useUpload'
import DefinitionBlock from '../components/home/DefinitionBlock'
import UploadCard from '../components/home/UploadCard'
import ProtocolSteps from '../components/home/ProtocolSteps'
import CapabilitiesSection from '../components/home/CapabilitiesSection'
import SecurityCard from '../components/home/SecurityCard'
import FaqSection from '../components/home/FaqSection'

export default function Home() {
  const { status, file, shareUrl, receiptUrl, error, selectedRegion, selectedTtl, wantsReceipt, handleFileSelect, handleRegionSelect, handleTtlSelect, handleWantsReceiptChange, handleUpload, reset } = useUpload()

  return (
    <main>
      <DefinitionBlock />
      <hr />
      <UploadCard
        status={status}
        file={file}
        shareUrl={shareUrl}
        receiptUrl={receiptUrl}
        error={error}
        selectedRegion={selectedRegion}
        selectedTtl={selectedTtl}
        wantsReceipt={wantsReceipt}
        onFileSelect={handleFileSelect}
        onRegionChange={handleRegionSelect}
        onTtlChange={handleTtlSelect}
        onWantsReceiptChange={handleWantsReceiptChange}
        onUpload={handleUpload}
        onReset={reset}
      />
      <ProtocolSteps />
      <CapabilitiesSection />
      <SecurityCard />
      <FaqSection />
    </main>
  )
}
