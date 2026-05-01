@smoke @login
Feature: Basic login

    @happy-path @static-check
    Scenario: Successful login with demo credentials
        Given the demo login page is open
        When I sign in with the demo credentials
        Then I should see the secure area message

    @happy-path @examples @examples-full
    Scenario Outline: Successful login shows full secure area content
        Given the demo login page is open
        When I sign in with the demo credentials
        Then the secure area should contain "<flashMessage>", "<pageHeading>", "<description>", and "<actionButtonText>"

        Examples:
            | excelFile      | sheetName |
            | testData1.xlsx | LoginData |

    @happy-path @examples @examples-short
    Scenario Outline: Successful login shows short secure area content
        Given the demo login page is open
        When I sign in with the demo credentials
        Then the secure area should contain "<flashMessage>", "<pageHeading>", "<description>", and "<actionButtonText>"

        Examples:
            | excelFile      | sheetName      |
            | testData1.xlsx | LoginDataShort |

    @happy-path @examples @examples-focus
    Scenario Outline: Successful login shows focused secure area content
        Given the demo login page is open
        When I sign in with the demo credentials
        Then the secure area should contain "<flashMessage>", "<pageHeading>", "<description>", and "<actionButtonText>"

        Examples:
            | excelFile      | sheetName      |
            | testData1.xlsx | LoginDataFocus |