import BigNumber from 'bignumber.js'
import { calculatePricePercentageChange } from 'blockchain/prices'
import { useAppContext } from 'components/AppContextProvider'
import { VaultContainerSpinner, WithLoadingIndicator } from 'helpers/AppSpinner'
import { WithErrorHandler } from 'helpers/errorHandlers/WithErrorHandler'
import { useObservableWithError } from 'helpers/observableHook'
import { zero } from 'helpers/zero'
import React from 'react'

import { ProtectionDetailsLayout, ProtectionDetailsLayoutProps } from './ProtectionDetailsLayout'

export function ProtectionDetailsControl({ id }: { id: BigNumber }) {
  console.log('Rendering ProtectionDetails', id.toString())
  const { stopLossTriggersData$, vault$, collateralPrices$, ilkDataList$ } = useAppContext()
  const slTriggerData$ = stopLossTriggersData$(id)
  const slTriggerDataWithError = useObservableWithError(slTriggerData$)
  const vaultDataWithError = useObservableWithError(vault$(id))
  const collateralPricesWithError = useObservableWithError(collateralPrices$)
  const ilksDataWithError = useObservableWithError(ilkDataList$)

  return (
    <WithErrorHandler
      error={[
        slTriggerDataWithError.error,
        vaultDataWithError.error,
        collateralPricesWithError.error,
        ilksDataWithError.error,
      ]}
    >
      <WithLoadingIndicator
        value={[
          slTriggerDataWithError.value,
          vaultDataWithError.value,
          collateralPricesWithError.value,
          ilksDataWithError.value,
        ]}
        customLoader={<VaultContainerSpinner />}
      >
        {([triggersData, vaultData, collateralPrices, ilkDataList]) => {
          const ilk = ilkDataList.filter((x) => x.ilk === vaultData.ilk)[0]
          const collateralPrice = collateralPrices.data.filter(
            (x) => x.token === vaultData.token,
          )[0]
          const XYZ = new BigNumber('1') // this value should be replaced with correct value from protection state
          const percentageChange = calculatePricePercentageChange(
            collateralPrice.currentPrice,
            collateralPrice.nextPrice,
          )
          const collateralizationRatio = vaultData.debt.isZero()
            ? zero
            : vaultData.lockedCollateral.times(collateralPrice.currentPrice).div(vaultData.debt)

          const liquidationPrice = vaultData.lockedCollateral.eq(zero)
            ? zero
            : vaultData.debt.times(ilk.liquidationRatio).div(vaultData.lockedCollateral)

          const props: ProtectionDetailsLayoutProps = {
            isStopLossEnabled: triggersData.isStopLossEnabled,
            slRatio: triggersData.stopLossLevel,
            vaultDebt: vaultData.debt,
            currentOraclePrice: collateralPrice.currentPrice,
            nextOraclePrice: collateralPrice.nextPrice,
            lockedCollateral: vaultData.lockedCollateral,

            collateralizationRatio,
            percentageChange,
            liquidationPrice,
            liquidationRatio: ilk.liquidationRatio,
            isStaticPrice: collateralPrice.isStaticPrice,
            token: vaultData.token,

            // protectionState mocked for now
            protectionState: {
              ilkData: ilk,
              inputAmountsEmpty: false,
              stage: 'editing',
              afterCollateralizationRatio: XYZ,
              afterSlRatio: XYZ,
              afterDebt: XYZ,
              afterLiquidationPrice: XYZ,
              afterLockedCollateral: XYZ,
            },
          }
          return <ProtectionDetailsLayout {...props} />
        }}
      </WithLoadingIndicator>
    </WithErrorHandler>
  )
}
