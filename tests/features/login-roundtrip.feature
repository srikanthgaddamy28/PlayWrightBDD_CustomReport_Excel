Feature: Login round trip

    @roundtrip
    Scenario Outline: Successful login and logout round trip
        Given the demo login page is open
        When I sign in with the demo credentials
        Then the secure area should contain "<flashMessage>", "<pageHeading>", "<description>", and "<actionButtonText>"
        Then I should be able to log out and see "<loggedOutMessage>" on the login page

        Examples:
            | excelFile      | sheetName          |
            | testData1.xlsx | LoginRoundTripData |