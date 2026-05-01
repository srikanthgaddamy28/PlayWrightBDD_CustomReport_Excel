@secure-area @content-variants
Feature: Secure area variants

    @secondary-examples @banner-variant
    Scenario Outline: Successful login shows secure area banner variant
        Given the demo login page is open
        When I sign in with the demo credentials
        Then the secure area should contain "<flashMessage>", "<pageHeading>", "<description>", and "<actionButtonText>"

        Examples:
            | excelFile      | sheetName        |
            | testData1.xlsx | SecureAreaBanner |

    @secondary-examples @description-variant
    Scenario Outline: Successful login shows secure area description variant
        Given the demo login page is open
        When I sign in with the demo credentials
        Then the secure area should contain "<flashMessage>", "<pageHeading>", "<description>", and "<actionButtonText>"

        Examples:
            | excelFile      | sheetName             |
            | testData1.xlsx | SecureAreaDescription |